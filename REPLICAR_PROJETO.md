# Guia para Replicar Este Projeto

Este projeto é um tracker de esportes com:
- `backend` em Node.js + Express
- `frontend` em React + Vite
- banco local em SQLite via `sql.js`
- sincronização periódica com APIs públicas

Use este arquivo como base para replicar a mesma estrutura para outros esportes, ligas ou domínios.

## Estrutura

```text
projeto/
  backend/
    server.js
    db/
    routes/
    services/
    sync/
  frontend/
    src/
    vite.config.js
  start-dev.bat
```

## Stack

- Backend: `express`, `cors`, `morgan`, `dotenv`, `axios`
- Banco: `sql.js` com persistência em arquivo `.db`
- Frontend: `react`, `react-router-dom`, `vite`

## Fluxo Do Projeto

1. O backend sobe e inicializa o banco.
2. Uma sync inicial roda alguns segundos depois do boot.
3. Syncs periódicas atualizam times, jogos e standings.
4. O frontend consome a API do backend em `/api`.
5. O backend também serve o frontend compilado, se existir em `frontend/dist`.

## Arquivos Principais

- [backend/server.js](backend/server.js)
- [backend/db/init.js](backend/db/init.js)
- [backend/routes/games.js](backend/routes/games.js)
- [backend/routes/standings.js](backend/routes/standings.js)
- [backend/routes/adminSync.js](backend/routes/adminSync.js)
- [backend/services/nbaService.js](backend/services/nbaService.js)
- [backend/services/nflService.js](backend/services/nflService.js)
- [backend/sync/syncGames.js](backend/sync/syncGames.js)
- [backend/sync/syncStandings.js](backend/sync/syncStandings.js)
- [frontend/src/api.js](frontend/src/api.js)
- [frontend/src/pages/Home.jsx](frontend/src/pages/Home.jsx)
- [frontend/src/pages/DashboardNBA.jsx](frontend/src/pages/DashboardNBA.jsx)
- [frontend/src/pages/DashboardNFL.jsx](frontend/src/pages/DashboardNFL.jsx)
- [frontend/src/components/GameCard.jsx](frontend/src/components/GameCard.jsx)

## Banco De Dados

O banco é criado e mantido em:

- `backend/db/sports.db`

Tabelas principais:

- `teams`
- `games`
- `standings`
- `sync_log`

### Observação Importante

Como o projeto usa `sql.js`, o banco é carregado em memória e depois exportado para o arquivo `.db`.

## Como Rodar

### Deploy No Coolify

Este projeto já tem um `Dockerfile` na raiz e pode subir como um único serviço.
Veja [`COOLIFY.md`](COOLIFY.md) para o passo a passo.

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

### Atalho

Se existir o arquivo:

- `start-dev.bat`

ele inicia backend e frontend em janelas separadas.

## Variáveis De Ambiente

Crie um `.env` no backend quando precisar ajustar URLs ou portas.

Exemplos:

```env
PORT=3001
SYNC_INTERVAL=300000
NBA_SITE_API_URL=https://site.api.espn.com/apis/site/v2/sports/basketball/nba
NBA_CORE_API_URL=https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba
NFL_API_URL=https://site.api.espn.com/apis/site/v2/sports/football/nfl
```

## Como Funciona A Sync

### 1. Coleta

- `services/*Service.js` busca dados da API externa.
- A lógica de coleta deve devolver um formato padronizado.

### 2. Normalização

- `sync/syncGames.js` converte data/hora para o fuso desejado.
- Os dados são gravados de forma consistente em `games`, `teams` e `sync_log`.

### 3. Classificação

- `sync/syncStandings.js` recalcula vitórias, derrotas, pontos e ranking.
- Sempre que mudar a regra de finalização de jogo, atualize aqui.

## Regras Para Replicar Em Outro Esporte

Se você quiser copiar esta estrutura para outra liga, siga este padrão:

1. Criar um novo serviço em `backend/services/<liga>Service.js`.
2. Criar uma função de sync em `backend/sync/syncGames.js` ou em um novo arquivo.
3. Ajustar o schema, se o esporte tiver campos extras.
4. Criar rotas novas em `backend/routes/`.
5. Adicionar a página correspondente no frontend.
6. Atualizar `frontend/src/api.js`.
7. Ajustar `GameCard.jsx` se o esporte tiver layout específico.

## Checklist De Adaptação

- Definir a API de origem
- Descobrir como a API expõe:
  - temporada atual
  - times
  - jogos
  - status
  - local
  - horário
- Confirmar fuso horário
- Confirmar como identificar jogos finalizados
- Confirmar se existe conferência/divisão/grupo
- Atualizar o schema do banco, se necessário
- Ajustar a UI para o novo formato dos dados

## Boas Práticas

- Padronizar `game_date` como `YYYY-MM-DD`
- Padronizar `game_time` como `HH:mm`
- Guardar `venue`, `venue_city` e `venue_state` quando existirem
- Registrar todas as syncs em `sync_log`
- Evitar depender de datas relativas sem normalização de fuso
- Validar no frontend depois de cada mudança de API

## Endpoints Da API

- `GET /api/health`
- `GET /api/games`
- `GET /api/games/live`
- `GET /api/games/upcoming`
- `GET /api/standings`
- `POST /api/admin/sync`
- `GET /api/admin/logs`
- `GET /api/admin/status`

## Dicas Para Replicar Rapidamente

Se for criar uma nova versão desse projeto para outra liga:

- copie a estrutura de `backend/services`
- copie a estrutura de `backend/sync`
- ajuste `routes`
- mantenha o contrato de resposta usado pelo frontend:
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

## Resumo

O segredo para replicar este projeto é manter três camadas separadas:

- integração com API externa
- normalização/sync
- apresentação no frontend

Se você seguir essa separação, fica simples trocar NBA/NFL por qualquer outra liga ou assunto.
