const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'sports.db');
const isNetlifyDb = Boolean(process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY_FUNCTION_NAME);
let db = null;
let SQL = null;
let pool = null;
let pgReady = false;

function pgSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function initPostgres() {
  if (pgReady) return;
  const { Pool } = require('pg');
  const { getConnectionString } = require('@netlify/database');
  const connectionString = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || getConnectionString();
  pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id BIGINT PRIMARY KEY, name TEXT NOT NULL, display_name TEXT, abbreviation TEXT,
      league TEXT NOT NULL, conference TEXT, division TEXT, logo_url TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS games (
      id BIGINT PRIMARY KEY, league TEXT NOT NULL, home_team_id BIGINT, away_team_id BIGINT,
      home_team TEXT NOT NULL, away_team TEXT NOT NULL, home_score INTEGER DEFAULT 0,
      away_score INTEGER DEFAULT 0, status TEXT DEFAULT 'scheduled', period TEXT,
      game_date TEXT NOT NULL, game_time TEXT, venue TEXT, venue_city TEXT,
      venue_state TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS standings (
      id BIGSERIAL PRIMARY KEY, league TEXT NOT NULL, team_id BIGINT, team TEXT NOT NULL,
      wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, draws INTEGER DEFAULT 0,
      points_for INTEGER DEFAULT 0, points_against INTEGER DEFAULT 0, streak TEXT,
      conference_rank INTEGER, division_rank INTEGER, win_pct REAL DEFAULT 0,
      games_played INTEGER DEFAULT 0, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sync_log (
      id BIGSERIAL PRIMARY KEY, league TEXT NOT NULL, status TEXT NOT NULL,
      message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  pgReady = true;
}

async function getDb() {
  if (isNetlifyDb) { await initPostgres(); return null; }
  if (!db) {
    SQL = await initSqlJs();
    db = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();
    initTables();
    await saveDb();
  }
  return db;
}

function initTables() {
  db.run(`CREATE TABLE IF NOT EXISTS teams (id INTEGER PRIMARY KEY, name TEXT NOT NULL, display_name TEXT, abbreviation TEXT, league TEXT NOT NULL, conference TEXT, division TEXT, logo_url TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS games (id INTEGER PRIMARY KEY, league TEXT NOT NULL, home_team_id INTEGER, away_team_id INTEGER, home_team TEXT NOT NULL, away_team TEXT NOT NULL, home_score INTEGER DEFAULT 0, away_score INTEGER DEFAULT 0, status TEXT DEFAULT 'scheduled', period TEXT, game_date TEXT NOT NULL, game_time TEXT, venue TEXT, venue_city TEXT, venue_state TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS standings (id INTEGER PRIMARY KEY AUTOINCREMENT, league TEXT NOT NULL, team_id INTEGER, team TEXT NOT NULL, wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, draws INTEGER DEFAULT 0, points_for INTEGER DEFAULT 0, points_against INTEGER DEFAULT 0, streak TEXT, conference_rank INTEGER, division_rank INTEGER, win_pct REAL DEFAULT 0, games_played INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS sync_log (id INTEGER PRIMARY KEY AUTOINCREMENT, league TEXT NOT NULL, status TEXT NOT NULL, message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
}

async function run(sql, params = []) {
  if (isNetlifyDb) { await initPostgres(); return pool.query(pgSql(sql), params); }
  await getDb(); db.run(sql, params); return null;
}

async function queryAll(sql, params = []) {
  if (isNetlifyDb) { await initPostgres(); const result = await pool.query(pgSql(sql), params); return result.rows; }
  await getDb();
  if (params.length) {
    const stmt = db.prepare(sql); stmt.bind(params); const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free(); return rows;
  }
  const result = db.exec(sql); if (!result.length) return [];
  return result[0].values.map(row => Object.fromEntries(result[0].columns.map((col, i) => [col, row[i]])));
}

async function queryOne(sql, params = []) { const rows = await queryAll(sql, params); return rows[0] || null; }
async function saveDb() { if (!isNetlifyDb && db) fs.writeFileSync(DB_PATH, Buffer.from(db.export())); }
async function logSync(league, status, message = '') { await run('INSERT INTO sync_log (league, status, message) VALUES (?, ?, ?)', [league, status, message]); await saveDb(); }
async function getSyncLogs(limit = 20) { return queryAll('SELECT * FROM sync_log ORDER BY created_at DESC LIMIT ?', [limit]); }
module.exports = { getDb, run, logSync, getSyncLogs, queryAll, queryOne, saveDb, isNetlifyDb };