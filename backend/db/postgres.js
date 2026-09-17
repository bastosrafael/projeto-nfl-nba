const { Pool } = require('pg');

let pool = null;

function validateConnectionString(connectionString, source) {
  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch (err) {
    throw new Error(
      `ERRO: ${source} invalida (nao e uma URL valida).\n` +
      'Exemplo: postgresql://usuario:senha@host.render.com:5432/database'
    );
  }

  const hostname = parsed.hostname;
  const database = parsed.pathname.replace(/^\//, '');
  const user = parsed.username;

  if (!hostname || !database) {
    throw new Error(
      `ERRO: ${source} invalida.\n` +
      'O hostname precisa conter o dominio completo do Render.\n' +
      'Exemplo: postgresql://usuario:senha@host.render.com/database'
    );
  }

  console.log('[DB CHECK]');
  console.log(`  host: ${hostname}`);
  console.log(`  database: ${database}`);
  console.log(`  user: ${user}`);

  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(hostname)) {
    throw new Error(
      'ERRO: DATABASE_URL invalida.\n' +
      `O hostname "${hostname}" nao contem dominio completo.\n` +
      'O host interno do Render (dpg-xxxx-a) so resolve dentro da rede do Render.\n' +
      'Use o "External Database URL" com dominio completo, ex.:\n' +
      '  postgresql://usuario:senha@dpg-xxxx-a.oregon-postgres.render.com/database'
    );
  }

  return connectionString;
}

function getConnectionString() {
  const source = process.env.DATABASE_URL ? 'DATABASE_URL' : 'NETLIFY_DB_URL';
  const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL precisa estar definida para usar PostgreSQL.');
  }
  return validateConnectionString(connectionString, source);
}

function isRenderHost(connectionString) {
  try {
    return new URL(connectionString).hostname.endsWith('.render.com');
  } catch (err) {
    return false;
  }
}

function getPool() {
  if (!pool) {
    const connectionString = getConnectionString();

    console.log('[PG CONNECT]');
    console.log(`  host: ${new URL(connectionString).hostname}`);
    console.log(`  database: ${new URL(connectionString).pathname.replace(/^\//, '')}`);
    console.log(`  user: ${new URL(connectionString).username}`);

    pool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      ...(isRenderHost(connectionString)
        ? { ssl: { rejectUnauthorized: false } }
        : {})
    });

    pool.on('error', (err) => {
      console.error('[PG POOL ERROR]', err.message);
    });
  }
  return pool;
}

async function testConnection() {
  const startedAt = Date.now();
  const rows = await queryAll('SELECT NOW() AS now');
  console.log(`[PG TEST] SELECT NOW() OK (${Date.now() - startedAt}ms) -> ${rows[0].now}`);
  return true;
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
  close,
  testConnection,
  getConnectionString
};
