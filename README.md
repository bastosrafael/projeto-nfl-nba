# NFL + NBA Tracker

Sistema de tracking para NBA e NFL com:
- backend em Node.js + Express
- frontend em React + Vite
- banco local em SQLite via `sql.js`
- sync automatizada com APIs públicas

## Visao Geral

O projeto organiza dados de:
- jogos
- times
- standings
- logs de sincronizacao

O backend coleta dados externos, normaliza os registros e o frontend consome a API para exibir a Home, a página NBA, a página NFL, a tela de jogos e o painel Admin.

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

## Portas

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`

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

## Integrações

- NBA: ESPN
- NFL: ESPN

O backend converte e grava os dados em um formato estável para o frontend:
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

Se quiser reutilizar a mesma arquitetura para outra liga, esporte ou domínio:

1. Crie um novo service em `backend/services/`.
2. Crie uma sync em `backend/sync/`.
3. Ajuste o schema do banco se precisar de novos campos.
4. Adicione as rotas em `backend/routes/`.
5. Crie a página correspondente no frontend.
6. Atualize o contrato de dados em `frontend/src/api.js`.
7. Reaproveite o componente `GameCard` ou adapte a UI.

O guia completo está em:

- [`REPLICAR_PROJETO.md`](REPLICAR_PROJETO.md)

## Contracto De Dados

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

- O projeto usa `sql.js`, então o banco é carregado em memória e persistido em arquivo.
- A sync roda automaticamente em intervalo configurável.
- A NBA só deve ser ajustada quando o calendário oficial da nova temporada estiver disponível.

## Licenca

Projeto interno / uso colaborativo.
