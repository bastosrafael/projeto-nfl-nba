# NFL + NBA Tracker

Aplicacao web para acompanhar jogos, placares e classificacoes da NBA e da NFL.
O backend sincroniza dados publicos da ESPN, grava os registros em SQLite e
serve a API e o frontend React pelo mesmo container.

## Aplicacao publicada

- URL publica: [https://nflnba.tail08f125.ts.net](https://nflnba.tail08f125.ts.net)
- URL da rede local: [http://projeto-nfl-nba.192.168.15.112.sslip.io](http://projeto-nfl-nba.192.168.15.112.sslip.io)
- Porta interna da aplicacao: `3001`
- Deploy: Dockerfile gerenciado pelo Coolify
- Repositorio: `bastosrafael/projeto-nfl-nba`

A URL `sslip.io` funciona somente quando o dispositivo consegue acessar a rede
`192.168.15.0/24`. O acesso externo usa Tailscale Funnel com HTTPS.

## Funcionalidades

- Home com jogos do dia, jogos ao vivo e resumo por liga.
- Paginas separadas para NBA e NFL.
- Classificacao por conferencia e divisao.
- Horarios convertidos para `America/Sao_Paulo`.
- Sincronizacao automatica no inicio e a cada cinco minutos.
- Calendario semanal de segunda a domingo.
- Interface responsiva para celular sem alterar o layout do computador.
- Banco SQLite persistente.
- API JSON para saude, jogos e classificacao.

Nao existe painel Admin publico. A atualizacao dos dados e automatica para
reduzir manutencao e impedir que visitantes disparem sincronizacoes.

## Regras das temporadas

### NFL

- Sincroniza somente eventos com `season.type = 2`, que representa temporada regular.
- Pre-temporada e pos-temporada nao entram no calendario exibido.
- Antes do inicio da temporada, a pagina mostra a primeira semana regular publicada.
- Depois do inicio, mostra somente a semana atual, de segunda a domingo.

### NBA

- Procura a temporada regular ativa ou a proxima temporada regular publicada.
- Pre-temporada e playoffs nao entram no calendario exibido.
- Enquanto a ESPN nao publicar os jogos regulares de 2026/2027, a pagina permanece sem jogos.
- Quando o calendario for publicado, a primeira semana regular aparecera automaticamente.
- Depois do inicio, a pagina passa a mostrar a semana atual.
- Resultados de temporadas encerradas nao sao exibidos como resultados da nova temporada.

## Regra semanal

O endpoint `GET /api/games/upcoming?league=NBA|NFL` retorna:

- a semana atual, se a temporada ja estiver em andamento;
- a primeira semana com jogos agendados, se a temporada ainda nao comecou;
- nenhum jogo, se o calendario regular ainda nao foi publicado.

O objeto `week` informa:

```json
{
  "start_date": "2026-09-07",
  "end_date": "2026-09-13",
  "mode": "first_scheduled"
}
```

Os modos possiveis sao `current` e `first_scheduled`.

## Layout responsivo

Acima de `640px`, o layout original de notebook e desktop e preservado.
Em telas de ate `640px`, sao aplicadas regras exclusivas:

- cabecalho superior compacto;
- navegacao fixa na parte inferior;
- banner inicial reduzido;
- botoes em largura total;
- indicadores em grade 2 x 2;
- cards de jogos compactos;
- suporte a `safe-area-inset-bottom`.

As regras moveis ficam no final de `frontend/src/App.css` para terem prioridade
sem modificar a versao desktop.

## Arquitetura

```text
Navegador
   |
   v
Coolify Proxy / Tailscale Funnel
   |
   v
Node.js + Express :3001
   |-- /api
   |-- frontend/dist
   |
   v
SQLite via sql.js
```

## Estrutura do projeto

```text
projeto-nfl-nba/
  backend/
    db/
      init.js
    routes/
    services/
      nbaService.js
      nflService.js
    sync/
      syncGames.js
      syncStandings.js
    server.js
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
  COOLIFY.md
  REPLICAR_PROJETO.md
```

## Executar localmente

### Backend

```bash
cd backend
npm ci
npm run dev
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

O frontend de desenvolvimento usa Vite. Em producao, o Dockerfile compila o
frontend e o Express serve o conteudo de `frontend/dist`.

## Variaveis de ambiente

Crie `backend/.env` somente na maquina ou configure os valores no Coolify:

```env
PORT=3001
SYNC_INTERVAL=300000
NBA_SITE_API_URL=https://site.api.espn.com/apis/site/v2/sports/basketball/nba
NBA_CORE_API_URL=https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba
NFL_API_URL=https://site.api.espn.com/apis/site/v2/sports/football/nfl
```

Essas integracoes publicas nao exigem chave de API. Nunca grave tokens, senhas
ou credenciais no repositorio.

## Endpoints

- `GET /api/health`
- `GET /api/games`
- `GET /api/games?league=NBA|NFL&date=YYYY-MM-DD`
- `GET /api/games/live`
- `GET /api/games/upcoming?league=NBA|NFL`
- `GET /api/standings`

Rotas desconhecidas em `/api` retornam JSON com status `404`.

## Banco de dados e persistencia

O arquivo local e `backend/db/sports.db`. No container, o diretorio persistente e:

```text
/app/backend/db
```

Tabelas principais:

- `teams`
- `games`
- `standings`
- `sync_log`

O banco, seus backups e arquivos de ambiente nao sao versionados no Git.

## Deploy no Coolify

Consulte [COOLIFY.md](COOLIFY.md). Configuracao essencial:

- Build Pack: `Dockerfile`
- Base Directory: `/`
- Dockerfile: `/Dockerfile`
- Porta exposta: `3001`
- Volume persistente: `/app/backend/db`

Depois de uma alteracao, valide o build, faca o deploy e teste:

```text
/api/health
/api/games/upcoming?league=NFL
/nba
/nfl
```

## Acesso publico com Tailscale Funnel

O Funnel publica o servico local com HTTPS sem comprar dominio:

```bash
sudo tailscale funnel --bg http://127.0.0.1:3001
tailscale funnel status
```

Requisitos:

- Tailscale instalado e autenticado;
- Funnel permitido na conta;
- hostname da maquina configurado como `nflnba`;
- servico `tailscaled` habilitado no boot.

O nome final inclui o dominio da rede Tailscale, por exemplo
`https://nflnba.<tailnet>.ts.net`.

## Verificacao e manutencao

```bash
curl http://127.0.0.1:3001/api/health
curl "http://127.0.0.1:3001/api/games/upcoming?league=NFL"
docker ps
docker logs --tail 100 <container>
tailscale funnel status
```

Os logs esperados apos o inicio incluem a inicializacao do banco, o intervalo
automatico e a quantidade de times e jogos sincronizados.

## Backup e recuperacao

Antes de alteracoes importantes:

```bash
tar -czf ~/backups/projeto-nfl-nba-$(date +%Y%m%d-%H%M%S).tar.gz \
  -C /caminho/para/pasta-pai projeto-nfl-nba
```

O volume do banco deve ter backup separado, pois nao faz parte do Git.

## Seguranca do repositorio

O `.gitignore` exclui:

- `.env` e variantes;
- `node_modules`;
- `frontend/dist`;
- bancos `.db` e backups;
- logs locais.

Antes de publicar:

```bash
git diff --cached
git grep -n -I -E "github_pat_|ghp_|password|senha|token"
```

Analise os resultados: nomes de variaveis e orientacoes na documentacao podem
ser legitimos, mas valores reais de credenciais nunca podem ser enviados.

## Reutilizar em outros projetos

O guia [REPLICAR_PROJETO.md](REPLICAR_PROJETO.md) explica como reaproveitar:

- integracao com APIs externas;
- normalizacao e persistencia;
- sincronizacao automatica;
- calendario semanal;
- deploy Docker/Coolify;
- publicacao com Tailscale Funnel;
- responsividade sem alterar o desktop.

## Licenca

Projeto pessoal para estudo e uso colaborativo.
