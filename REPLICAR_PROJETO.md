# Guia para replicar o projeto

Este documento descreve o padrao reutilizavel do NFL + NBA Tracker para criar
outros trackers, paineis de dados ou aplicacoes sincronizadas.

## Arquitetura recomendada

```text
API externa
   |
   v
Service de integracao
   |
   v
Sync e normalizacao
   |
   v
SQLite persistente
   |
   v
Express /api
   |
   v
React responsivo
```

Separe integracao, persistencia e apresentacao. Isso permite trocar a fonte de
dados ou criar uma nova liga sem reescrever a aplicacao inteira.

## Stack

- Backend: Node.js, Express, Axios, dotenv e Morgan.
- Banco: `sql.js` com persistencia em arquivo SQLite.
- Frontend: React, React Router e Vite.
- Producao: Dockerfile multi-stage.
- Deploy: Coolify.
- Acesso publico gratuito: Tailscale Funnel.

## Estrutura base

```text
projeto/
  backend/
    db/
      init.js
    routes/
    services/
    sync/
    server.js
    package.json
  frontend/
    src/
      components/
      pages/
      App.css
      App.jsx
      api.js
    package.json
    vite.config.js
  Dockerfile
  .dockerignore
  .gitignore
```

Nao versione `node_modules`, `dist`, bancos, backups ou arquivos `.env`.

## Fluxo de inicializacao

1. O Express inicia o SQLite.
2. O servidor agenda a sincronizacao automatica.
3. Uma sincronizacao inicial busca dados externos.
4. Services convertem respostas externas para objetos internos.
5. A camada de sync grava times, jogos, standings e logs.
6. O frontend consulta somente a API interna.
7. Em producao, o Express tambem serve `frontend/dist`.

## Criar uma nova integracao

### 1. Investigar a API

Confirme:

- como identificar a temporada;
- tipos de temporada regular, pre-temporada e playoffs;
- datas de inicio e fim;
- IDs de times e jogos;
- status de jogo;
- fuso dos horarios;
- paginacao e limites;
- disponibilidade de calendario futuro.

Nao presuma que "temporada atual" significa temporada regular. Muitas APIs
retornam pre-temporada ou a temporada encerrada se o filtro nao for explicito.

### 2. Criar o service

Crie `backend/services/<nome>Service.js` com funcoes para:

- localizar a temporada desejada;
- buscar times;
- buscar jogos;
- normalizar a resposta externa.

O service nao deve conhecer componentes React.

### 3. Padronizar os jogos

Use um contrato consistente:

- `league`
- `home_team_id`
- `away_team_id`
- `home_team`
- `away_team`
- `home_score`
- `away_score`
- `status`
- `period`
- `game_date` em `YYYY-MM-DD`
- `game_time` em `HH:mm`
- `venue`
- `venue_city`
- `venue_state`

Converta datas para o fuso escolhido antes de persistir. Neste projeto o fuso e
`America/Sao_Paulo`.

### 4. Criar a sincronizacao

A funcao de sync deve:

1. abrir o banco;
2. remover somente os dados antigos da liga correta, quando necessario;
3. buscar times e jogos;
4. inserir ou atualizar registros;
5. atualizar classificacoes;
6. registrar sucesso ou erro;
7. persistir o banco.

Uma falha em uma liga nao deve corromper dados de outra liga.

### 5. Automatizar

Use uma sincronizacao no boot e um intervalo configuravel:

```env
SYNC_INTERVAL=300000
```

Evite expor uma pagina Admin publica apenas para atualizar dados. Se operacoes
manuais forem realmente necessarias, proteja-as com autenticacao e autorizacao.

## Calendario semanal

Para uma pagina semanal:

1. calcule a segunda-feira da data de referencia;
2. use o domingo seguinte como fim;
3. antes da temporada, localize o primeiro jogo regular futuro;
4. mostre a semana que contem esse primeiro jogo;
5. depois do inicio, mostre somente a semana atual;
6. nao avance automaticamente para outra semana se a temporada ja comecou e a
   semana atual estiver vazia.

Retorne metadados junto com os jogos:

```json
{
  "week": {
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "mode": "current"
  }
}
```

Isso permite ao frontend explicar exatamente qual periodo esta sendo exibido.

## Banco

Tabelas comuns:

- `teams`
- `games`
- `standings`
- `sync_log`

Com `sql.js`, o banco e carregado em memoria e exportado para arquivo. Chame a
rotina de persistencia depois das alteracoes.

Em Docker, monte um volume no diretorio do banco. Nunca dependa da camada
gravavel do container para dados permanentes.

## API

Endpoints basicos:

- `GET /api/health`
- `GET /api/games`
- `GET /api/games/live`
- `GET /api/games/upcoming`
- `GET /api/standings`

Boas praticas:

- valide parametros;
- limite quantidades;
- normalize erros em JSON;
- retorne `404` para endpoints inexistentes;
- nao exponha stack traces ou segredos.

## Frontend

Crie:

- Home resumida;
- pagina por categoria ou liga;
- pagina ao vivo;
- pagina de classificacao;
- componentes reutilizaveis para cards e tabelas.

O frontend deve usar caminhos relativos, como `/api/games`, para funcionar no
mesmo dominio do backend.

## Responsividade sem alterar desktop

Mantenha os estilos de desktop como padrao e adicione regras moveis no final do
CSS:

```css
@media (max-width: 640px) {
  /* Somente ajustes para celular. */
}
```

Checklist:

- sem rolagem horizontal;
- menu acessivel com uma mao;
- botoes com pelo menos 44px de altura;
- cards legiveis em 360px;
- grade 2 x 2 para indicadores pequenos;
- `safe-area-inset-bottom` em navegacao inferior;
- teste separado em 360px e 1280px.

Elementos com `backdrop-filter` podem criar um novo contexto para descendentes
`position: fixed`. Se uma barra inferior ficar presa no topo, remova o filtro
do ancestral no breakpoint movel e aplique o efeito diretamente na barra.

## Docker

Use build multi-stage:

1. instalar dependencias do frontend;
2. compilar com Vite;
3. instalar apenas dependencias de producao do backend;
4. copiar `dist` para a imagem final;
5. expor uma unica porta.

Teste:

```bash
docker build -t meu-app .
docker run --rm -p 3001:3001 meu-app
```

## Coolify

Configuracao comum:

- Build Pack: Dockerfile.
- Base Directory: `/`.
- Dockerfile: `/Dockerfile`.
- Porta: a mesma usada pelo Express.
- Volume: diretorio do SQLite.
- Variaveis: configuradas no painel, nunca no Git.

Veja [COOLIFY.md](COOLIFY.md).

## Publicacao gratuita

O Tailscale Funnel fornece uma URL HTTPS publica sem comprar dominio:

```bash
sudo tailscale funnel --bg http://127.0.0.1:3001
tailscale funnel status
```

Ele e apropriado para projetos pessoais e compartilhamento controlado. O
endereco depende do hostname e do nome da tailnet.

## Seguranca

`.gitignore` minimo:

```gitignore
**/node_modules/
frontend/dist/
backend/.env
.env
.env.*
!.env.example
backend/db/*.db
backend/db/*.db.*
*.log
```

Antes do push:

1. revise `git status`;
2. use `git diff --cached`;
3. procure tokens e senhas;
4. confirme que nenhum `.env` esta rastreado;
5. confirme que banco e backups nao estao no commit.

Se uma credencial ja foi publicada, apenas apaga-la do commit novo nao basta:
revogue a credencial e, se necessario, limpe o historico.

## Testes antes de publicar

- verificacao de sintaxe do backend;
- build do frontend;
- `GET /api/health`;
- jogos ao vivo sem falsos positivos;
- filtros de temporada;
- limites de segunda a domingo;
- pagina vazia quando nao ha calendario;
- tela de 360 x 800;
- tela de 1280 x 800;
- reinicio do container mantendo o banco;
- acesso externo pelo Funnel.

## Checklist final para um novo projeto

- [ ] API e licenca de uso confirmadas
- [ ] Temporada regular identificada explicitamente
- [ ] Datas e fuso normalizados
- [ ] Contrato de dados definido
- [ ] Sync automatica configurada
- [ ] Banco persistente
- [ ] API validada
- [ ] Frontend responsivo
- [ ] Dockerfile testado
- [ ] Volume configurado
- [ ] Segredos fora do Git
- [ ] Backup criado
- [ ] URL local testada
- [ ] URL publica testada

## Regra principal

Uma aplicacao facil de replicar mantem independentes:

1. fonte externa;
2. normalizacao e persistencia;
3. API interna;
4. interface;
5. infraestrutura de deploy.
