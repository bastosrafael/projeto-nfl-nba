const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'sports.db');

let db = null;
let SQL = null;

async function getDb() {
  if (!db) {
    SQL = await initSqlJs();
    
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    
    initTables();
    saveDb();
  }
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      display_name TEXT,
      abbreviation TEXT,
      league TEXT NOT NULL CHECK(league IN ('NBA', 'NFL')),
      conference TEXT,
      division TEXT,
      logo_url TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY,
      league TEXT NOT NULL CHECK(league IN ('NBA', 'NFL')),
      home_team_id INTEGER,
      away_team_id INTEGER,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_score INTEGER DEFAULT 0,
      away_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'scheduled',
      period TEXT,
      game_date TEXT NOT NULL,
      venue TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  ensureColumn('games', 'game_time TEXT');
  ensureColumn('games', 'venue_city TEXT');
  ensureColumn('games', 'venue_state TEXT');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS standings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      league TEXT NOT NULL CHECK(league IN ('NBA', 'NFL')),
      team_id INTEGER,
      team TEXT NOT NULL,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      points_for INTEGER DEFAULT 0,
      points_against INTEGER DEFAULT 0,
      streak TEXT,
      conference_rank INTEGER,
      division_rank INTEGER,
      win_pct REAL DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      league TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function ensureColumn(tableName, columnDefinition) {
  const columnName = columnDefinition.split(' ')[0];
  const existingColumns = queryAll(`PRAGMA table_info(${tableName})`);
  if (!existingColumns.some(column => column.name === columnName)) {
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
  }
}

function logSync(league, status, message = '') {
  db.run('INSERT INTO sync_log (league, status, message) VALUES (?, ?, ?)', 
    [league, status, message]);
  saveDb();
}

function getSyncLogs(limit = 20) {
  return queryAll('SELECT * FROM sync_log ORDER BY created_at DESC LIMIT ?', [limit]);
}

function queryAll(sql, params = []) {
  if (params.length > 0) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }
  
  const result = db.exec(sql);
  if (result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

module.exports = { getDb, logSync, getSyncLogs, queryAll, queryOne, saveDb };
