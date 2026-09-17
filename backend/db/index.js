/**
 * Camada unica de persistencia do backend.
 *
 * Ordem de decisao:
 *   1. DATABASE_URL definida  -> PostgreSQL (Render / producao)
 *   2. NETLIFY_DB_URL definida -> PostgreSQL (Netlify)
 *   3. Nenhuma definida       -> SQLite local (sql.js em backend/db/sports.db)
 */
const postgresEnabled = Boolean(process.env.DATABASE_URL || process.env.NETLIFY_DB_URL);

const adapter = postgresEnabled
  ? require('./postgres')
  : require('./init');

if (postgresEnabled) {
  console.log('[DB] PostgreSQL ativado via ' + (process.env.DATABASE_URL ? 'DATABASE_URL' : 'NETLIFY_DB_URL'));
} else {
  console.log('[DB] SQLite local ativado (nenhuma DATABASE_URL definida)');
}

const isPostgres = Boolean(process.env.DATABASE_URL || process.env.NETLIFY_DB_URL);

module.exports = {
  ...adapter,
  isPostgres
};
