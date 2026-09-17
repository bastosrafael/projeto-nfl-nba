# Changelog

Todas as mudanças importantes deste projeto serão documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

---

## v1.0.0 - Primeira versão estável

**Data:** 15/09/2026

### Adicionado

- Dashboard principal NFL + NBA.
- Integração com jogos NBA e NFL.
- Visualização de:
  - próximos jogos
  - jogos do dia
  - jogos ao vivo
  - resultados
  - classificação.
- Logos dos times NBA e NFL.
- Componente reutilizável `TeamLogo`.
- Fallback de logos com iniciais quando necessário.
- Glossário de estatísticas NFL.

### Melhorado

- Layout responsivo para celular.
- Cards de jogos adaptados para mobile.
- Classificação transformada em cards no celular.
- Menu mobile com melhor navegação.
- Cards de resumo do dashboard compactados.
- Melhor distribuição visual dos confrontos.

### Corrigido

- Erro "Not Found" ao atualizar rotas do React Router no Render.
- Carregamento inicial dos jogos NBA no dashboard.
- Alinhamento dos confrontos mobile.
- Posicionamento do VS entre os times.
- Separadores incorretos "X" substituídos por "VS".
- Problemas de logos ausentes através de aliases de times.
- Ajustes de espaçamento e responsividade.

---

## render-config

Marco técnico.

### Alterado

- Configuração inicial do frontend para consumir backend hospedado no Render.
- Ajustes necessários para ambiente publicado.

---

## v1.1.0 - Migração PostgreSQL

**Data:** 17/09/2026

### Adicionado

- Suporte a PostgreSQL no backend (`backend/db/postgres.js`) usando a variável `DATABASE_URL`.
- Camada única de persistência em `backend/db/index.js`:
  - Com `DATABASE_URL` (ou `NETLIFY_DB_URL`) definida: todos os dados vão para PostgreSQL.
  - Sem ela: fallback automático para o SQLite local (`backend/db/sports.db`) — o funcionamento local permanece intacto.
- Script de schema `backend/db/migrate.js` que cria/valida as tabelas `teams`, `games`, `standings`, `sync_log` e `nfl_schedule_weeks` com a mesma estrutura do SQLite.
- Script de migração de dados `backend/db/migrate-sqlite-to-postgres.js`:
  - Lê `backend/db/sports.db`.
  - Copia `teams`, `games`, `standings`, `sync_log` e `nfl_schedule_weeks` para o PostgreSQL.
  - Ajusta as sequences de `standings` e `sync_log` e imprime relatório por tabela.

### Corrigido

- Problema do Render: o backend iniciava com o SQLite vazio em produção (o arquivo não sobrevive ao deploy), fazendo `/api/games` retornar listas vazias.
- Agora o Render usa PostgreSQL com migrations e validação de tabelas executadas automaticamente no start do servidor.

### Notas de deploy no Render

1. Criar um banco PostgreSQL (Render Postgres) e copiar a *Internal Database URL*.
2. Definir `DATABASE_URL` como variável de ambiente do serviço do backend.
3. (Opcional, uma vez) Rodar a migração dos dados locais:
   - `$env:DATABASE_URL = "postgres://..."`
   - `node backend/db/migrate-sqlite-to-postgres.js`
4. Fazer deploy: as migrations rodarão sozinhas no boot do backend.

---

## Próximas versões
