/**
 * Migra os dados de backend/db/sports.db (SQLite) para o PostgreSQL
 * apontado por DATABASE_URL.
 *
 * Uso:
 *   $env:DATABASE_URL = "postgres://..."; node db/migrate-sqlite-to-postgres.js
 *
 * Passos:
 *   1. Aplica o schema (db/migrate.js)
 *   2. Limpa as tabelas alvo
 *   3. Copia teams, games, standings, sync_log e nfl_schedule_weeks
 *   4. Ajusta sequences de tabelas com id auto-incremento
 *   5. Imprime relatorio por tabela
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { run, queryAll, transaction, testConnection } = require('./index');
const { runMigrations } = require('./migrate');

const SQLITE_PATH = path.join(__dirname, 'sports.db');

const TABLES = [
  { name: 'nfl_schedule_weeks', columns: ['season_year', 'season_type', 'season_week', 'start_date', 'end_date'] },
  { name: 'teams', columns: ['id', 'name', 'display_name', 'abbreviation', 'league', 'conference', 'division', 'logo_url', 'updated_at'] },
  { name: 'games', columns: ['id', 'league', 'home_team_id', 'away_team_id', 'home_team', 'away_team', 'home_score', 'away_score', 'status', 'period', 'game_date', 'venue', 'updated_at', 'game_time', 'venue_city', 'venue_state', 'season_year', 'season_type', 'season_week', 'broadcast'] },
  { name: 'standings', columns: ['league', 'team_id', 'team', 'wins', 'losses', 'draws', 'points_for', 'points_against', 'streak', 'conference_rank', 'division_rank', 'win_pct', 'games_played', 'updated_at'] },
  { name: 'sync_log', columns: ['league', 'status', 'message', 'created_at'] }
];

function rowsFromSqlite(db, table, columns) {
  const escaped = columns.map(column => `"${column}"`).join(', ');
  const result = db.exec(`SELECT ${escaped} FROM "${table}"`);
  if (result.length === 0) return [];
  const { columns: cols, values } = result[0];
  return values.map(row => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function normalizeValue(value) {
  if (value instanceof Uint8Array) return null;
  return value === null || value === undefined ? null : value;
}

async function migrateTable(db, table) {
  const rows = rowsFromSqlite(db, table.name, table.columns);

  const chunks = [];
  for (const row of rows) {
    const values = table.columns.map(column => normalizeValue(row[column]));
    const placeholders = table.columns.map(() => '?').join(', ');
    const columnsSql = table.columns.map(column => `"${column}"`).join(', ');
    chunks.push({ sql: `INSERT INTO ${table.name} (${columnsSql}) VALUES (${placeholders})`, values });
  }

  const count = await transaction(async (tx) => {
    let inserted = 0;
    for (const chunk of chunks) {
      const result = await tx.run(chunk.sql, chunk.values);
      inserted += result.rowCount || 1;
    }
    return inserted;
  });

  return count;
}

async function recomputeSequences() {
  for (const table of ['standings', 'sync_log']) {
    const maxRows = await queryAll(`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${table}`);
    const maxId = Number(maxRows[0]?.max_id) || 0;
    await run(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), $1, true)`,
      [Math.max(maxId, 1)]
    );
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERRO: DATABASE_URL precisa estar definida para rodar esta migracao.');
    console.error('Exemplo (PowerShell): $env:DATABASE_URL = "postgres://usuario:senha@host:5432/banco"');
    process.exit(1);
  }

  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`ERRO: SQLite nao encontrado em ${SQLITE_PATH}`);
    process.exit(1);
  }

  const report = [];

  console.log('[MigrateData] 0) Testando conexao PostgreSQL (SELECT NOW())...');
  await testConnection();

  console.log('[MigrateData] 1) Carregando sports.db...');
  const SQL = await initSqlJs();
  const sqliteDb = new SQL.Database(fs.readFileSync(SQLITE_PATH));

  console.log('[MigrateData] 2) Aplicando schema PostgreSQL...');
  await runMigrations();

  console.log('[MigrateData] 3) Limpando tabelas alvo...');
  await transaction(async (tx) => {
    for (const table of [...TABLES].reverse()) {
      await tx.run(`DELETE FROM ${table.name}`);
    }
  });

  console.log('[MigrateData] 4) Copiando dados...');
  for (const table of TABLES) {
    try {
      const count = await migrateTable(sqliteDb, table);
      report.push({ table: table.name, migrated: count, error: null });
    } catch (error) {
      report.push({ table: table.name, migrated: 0, error: error.message });
    }
  }

  console.log('[MigrateData] 5) Ajustando sequences...');
  await recomputeSequences();

  console.log('\n===== RELATORIO DA MIGRACAO =====');
  for (const item of report) {
    if (item.error) {
      console.log(`  ${item.table}: FALHOU - ${item.error}`);
    } else {
      console.log(`  ${item.table}: ${item.migrated} registros migrados`);
    }
  }
  console.log('=================================');

  const anyError = report.some(item => item.error);
  process.exit(anyError ? 1 : 0);
}

main().catch((err) => {
  console.error('[MigrateData] Falha fatal:', err.message);
  process.exit(1);
});
