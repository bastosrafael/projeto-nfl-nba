# NFL + NBA Tracker

Sistema de tracking para NBA e NFL com:
- backend em Node.js + Express
- frontend em React + Vite
- banco local em SQLite via `sql.js`
- sincronizacao automatica com APIs publicas

## Estado Atual

O projeto esta publicado no Coolify da maquina Linux da rede local.

- URL local atual do app: [http://projeto-nfl-nba.192.168.15.112.sslip.io](http://projeto-nfl-nba.192.168.15.112.sslip.io)
- URL publica temporaria via Tailscale Funnel: [https://nflnba.tail08f125.ts.net](https://nflnba.tail08f125.ts.net)
- URL local direta do CasaOS: [http://192.168.15.112:8082](http://192.168.15.112:8082)
- URL local direta do Coolify: [http://192.168.15.112:8000](http://192.168.15.112:8000)
- Servidor local: `192.168.15.112`
- Deploy principal: Coolify
- Repositorio GitHub: `bastosrafael/projeto-nfl-nba`

Observacoes:
- o dominio `sslip.io` resolve para o IP local `192.168.15.112`;
- para acesso fora do Wi-Fi, o app esta exposto por Tailscale Funnel com URL publica temporaria;
- a URL publica atual depende do hostname da maquina Tailscale e pode mudar se o nome do host for alterado;
- quando a temporada da NBA nao esta ativa, a pagina da NBA deve exibir apenas o bloco `Ultimos Resultados` com `Nenhum resultado recente.`;
- em 06/07/2026, o CasaOS foi movido da porta `80` para `8082` para liberar `80/443` para o Coolify Proxy.

## Visao Geral

O projeto organiza dados de:
- jogos
- times
- standings
- logs de sincronizacao

O backend coleta dados externos, normaliza os registros e o frontend consome a API para exibir a Home, a pagina NBA, a pagina NFL, a tela de jogos e o painel Admin.

## Estrutura

```text
projeto-nfl-nba/
  backend/
    db/
    routes/
    services/
    sync/
    server.js
  frontend/
    src/
    vite.config.js
  start-dev.bat
  REPLICAR_PROJETO.md
```

## Como Rodar

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Iniciar tudo com um clique

Execute:

- [`start-dev.bat`](start-dev.bat)

Ele abre backend e frontend em janelas separadas.

## Deploy no Coolify

Veja o guia pronto em [`COOLIFY.md`](COOLIFY.md).

## O Que Ja Foi Feito Nesta Etapa

### Publicacao e infraestrutura

- Repositorio GitHub criado e sincronizado.
- Aplicacao configurada no Coolify.
- Porta do app definida como `3001`.
- Volume persistente configurado para o SQLite em `/app/backend/db`.
- Variaveis de ambiente configuradas para NBA, NFL e sincronizacao automatica.
- Acesso publico temporario criado com tunel Cloudflare.

### Ajustes de interface

- A Home foi reorganizada para destacar:
  - jogos de hoje
  - jogos ao vivo
  - proximos jogos
- O contador generico de `10 jogos` foi removido da logica principal da Home.
- A tela passou a buscar jogos pela data de hoje no fuso de Sao Paulo.
- A pagina da NBA foi alinhada ao comportamento da NFL para a area de `Ultimos Resultados`.

### Estado do deploy

- A aplicacao esta respondendo pela URL local acima.
- O build do frontend foi validado com sucesso.
- O bundle e o HTML publicados ja apontam para a versao nova da Home.
- O Docker esta ativo pelo `systemd` e habilitado para subir no boot.
- O container do app e o `coolify-proxy` usam politica de restart `unless-stopped`.
- O CasaOS Gateway esta habilitado no boot e configurado na porta `8082`.
- O Tailscale Funnel foi habilitado para publicar o app fora da rede local.

## Portas

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`
- App publicado pelo Coolify Proxy: `80/443`
- Coolify painel: `http://192.168.15.112:8000`
- CasaOS: `http://192.168.15.112:8082`
- Lighttpd local: `http://192.168.15.112:8081`

## Endpoints Da API

- `GET /api/health`
- `GET /api/games`
- `GET /api/games/live`
- `GET /api/games/upcoming`
- `GET /api/standings`
- `POST /api/admin/sync`
- `GET /api/admin/logs`
- `GET /api/admin/status`

## Banco De Dados

O banco fica em:

- `backend/db/sports.db`

Tabelas principais:
- `teams`
- `games`
- `standings`
- `sync_log`

## Integracoes

- NBA: ESPN
- NFL: ESPN

O backend converte e grava os dados em um formato estavel para o frontend:
- `game_date`
- `game_time`
- `venue`
- `venue_city`
- `venue_state`

## Variaveis De Ambiente

Exemplo de `.env` no backend:

```env
PORT=3001
SYNC_INTERVAL=300000
NBA_SITE_API_URL=https://site.api.espn.com/apis/site/v2/sports/basketball/nba
NBA_CORE_API_URL=https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba
NFL_API_URL=https://site.api.espn.com/apis/site/v2/sports/football/nfl
```

## Fluxo Do Projeto

1. O backend inicializa o banco.
2. A sync carrega times e jogos.
3. As standings sao recalculadas.
4. O frontend consome a API.
5. O painel Admin permite disparar sync manual e ver logs.

## Replicar Para Outras Coisas

Se quiser reutilizar a mesma arquitetura para outra liga, esporte ou dominio:

1. Crie um novo service em `backend/services/`.
2. Crie uma sync em `backend/sync/`.
3. Ajuste o schema do banco se precisar de novos campos.
4. Adicione as rotas em `backend/routes/`.
5. Crie a pagina correspondente no frontend.
6. Atualize o contrato de dados em `frontend/src/api.js`.
7. Reaproveite o componente `GameCard` ou adapte a UI.

O guia completo esta em:

- [`REPLICAR_PROJETO.md`](REPLICAR_PROJETO.md)

## Contrato De Dados

O frontend espera campos como:
- `league`
- `home_team`
- `away_team`
- `home_score`
- `away_score`
- `status`
- `game_date`
- `game_time`
- `venue`
- `venue_city`
- `venue_state`

## Observacoes

- O projeto usa `sql.js`, entao o banco e carregado em memoria e persistido em arquivo.
- A sync roda automaticamente em intervalo configuravel.
- A NBA so deve ser ajustada quando o calendario oficial da nova temporada estiver disponivel.
- Se a URL publica mudar, procure a secao "Estado Atual" acima.
- Se for preciso publicar novamente fora da rede, verifique primeiro o estado do Tailscale Funnel antes de mexer no deploy.

## Licenca

Projeto interno / uso colaborativo.
