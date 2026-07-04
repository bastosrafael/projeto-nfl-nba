# Deploy no Coolify

Este projeto roda melhor como um único serviço Docker.

## Arquitetura

- Frontend React/Vite é compilado no build da imagem
- Backend Node/Express serve a API e também o frontend compilado
- O frontend usa apenas chamadas relativas em `/api`
- O banco atual é SQLite via `sql.js`
- Persistência é obrigatória para `backend/db`

## Arquivo principal

- `Dockerfile` na raiz do repositório

## Porta

- `3001`

## Volume persistente

Monte um volume em:

- `/app/backend/db`

Isso preserva:

- `sports.db`
- `sync_log`
- times, jogos e standings sincronizados

## Variáveis de ambiente sugeridas

- `PORT=3001`
- `SYNC_INTERVAL=300000`
- `NBA_SITE_API_URL=https://site.api.espn.com/apis/site/v2/sports/basketball/nba`
- `NBA_CORE_API_URL=https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba`
- `NFL_API_URL=https://site.api.espn.com/apis/site/v2/sports/football/nfl`

## Passo a passo no Coolify

1. Crie um novo Application.
2. Aponte para este repositório.
3. Escolha deploy por Dockerfile.
4. Mantenha a raiz do projeto como build context.
5. Configure a porta `3001`.
6. Adicione o volume persistente em `/app/backend/db`.
7. Configure as variáveis de ambiente acima.
8. Faça deploy.

## Verificação pós-deploy

Abra no navegador:

- `/api/health`
- `/api/admin/status`
- a home do frontend

Se a home abrir e os endpoints responderem JSON, o deploy está correto.
