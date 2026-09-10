const { Pool } = require('pg');

let pool = null;

function getConnectionString() {
  const connectionString = process.env.NETLIFY_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('NETLIFY_DB_URL ou DATABASE_URL precisa estar definida para usar PostgreSQL.');
  }
  return connectionString;
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getConnectionString(),
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000
    });
  }
  return pool;
}

function translatePlaceholders(sql) {
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let translated = '';

  for (let position = 0; position < sql.length; position += 1) {
    const character = sql[position];
    const nextCharacter = sql[position + 1];

    if (character === "'" && !inDoubleQuote) {
      translated += character;
      if (inSingleQuote && nextCharacter === "'") {
        translated += nextCharacter;
        position += 1;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }

    if (character === '"' && !inSingleQuote) {
      translated += character;
      if (inDoubleQuote && nextCharacter === '"') {
        translated += nextCharacter;
        position += 1;
      } else {
        inDoubleQuote = !inDoubleQuote;
      }
      continue;
    }

    if (character === '?' && !inSingleQuote && !inDoubleQuote) {
      index += 1;
      translated += `$${index}`;
    } else {
      translated += character;
    }
  }

  return translated;
}

function formatDate(value) {
  return value.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function normalizeRows(rows) {
  return rows.map(row => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value instanceof Date ? formatDate(value) : value])
  ));
}

function createExecutor(client) {
  async function queryAll(sql, params = []) {
    const result = await client.query(translatePlaceholders(sql), params);
    return normalizeRows(result.rows);
  }

  async function queryOne(sql, params = []) {
    const rows = await queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async function run(sql, params = []) {
    const result = await client.query(translatePlaceholders(sql), params);
    return {
      rowCount: result.rowCount,
      rows: normalizeRows(result.rows)
    };
  }

  return {
    queryAll,
    queryOne,
    run
  };
}

async function getDb() {
  return getPool();
}

async function queryAll(sql, params = []) {
  return createExecutor(getPool()).queryAll(sql, params);
}

async function queryOne(sql, params = []) {
  return createExecutor(getPool()).queryOne(sql, params);
}

async function run(sql, params = []) {
  return createExecutor(getPool()).run(sql, params);
}

async function transaction(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('transaction requer uma função callback.');
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(createExecutor(client));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function logSync(league, status, message = '') {
  await run(
    'INSERT INTO sync_log (league, status, message) VALUES (?, ?, ?)',
    [league, status, message]
  );
}

async function getSyncLogs(limit = 20) {
  return queryAll('SELECT * FROM sync_log ORDER BY created_at DESC LIMIT ?', [limit]);
}

async function saveDb() {
  // PostgreSQL persiste cada operação no servidor; não existe arquivo para exportar.
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getDb,
  run,
  queryAll,
  queryOne,
  transaction,
  logSync,
  getSyncLogs,
  saveDb,
  close
};
