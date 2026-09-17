require('dotenv').config();
const express = require('express');
const path = require('path');
const { getDb, isPostgres } = require('./db');
const app = require('./app');

const PORT = process.env.PORT || 3001;
let server = null;
let shuttingDown = false;

// Inicializar banco
async function start() {
  await getDb();

  if (isPostgres) {
    const { runMigrations } = require('./db/migrate');
    console.log('[DB] Modo PostgreSQL: aplicando migrations e validando tabelas...');
    await runMigrations();
    console.log('[DB] PostgreSQL pronto.');
  } else {
    console.log('[DB] Banco de dados SQLite inicializado');
  }
  
  const { syncAll } = require('./sync/syncGames');
  const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL) || 300000;
  
  console.log(`[Sync] Sync automatico a cada ${SYNC_INTERVAL / 1000} segundos`);
  
  // Primeira sync apos 3s
  setTimeout(async () => {
    console.log('[Sync] Primeira sincronizacao...');
    try {
      await syncAll();
    } catch (e) {
      console.error('[Sync] Erro na primeira sync:', e.message);
    }
  }, 3000);
  
  // Sync periodico
  setInterval(async () => {
    console.log('[Sync] Sincronizacao periodica...');
    try {
      await syncAll();
    } catch (e) {
      console.error('[Sync] Erro na sync periodica:', e.message);
    }
  }, SYNC_INTERVAL);
  
  // Servir frontend (se existir)
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
  
  server = app.listen(PORT, () => {
    console.log(`[Server] NFL + NBA Tracker rodando em http://localhost:${PORT}`);
    console.log(`[Server] API: http://localhost:${PORT}/api`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Porta ${PORT} ja esta em uso. Feche o processo antigo ou altere a variavel PORT.`);
      process.exit(1);
    }
    console.error('[Server] Erro no listen:', err);
    process.exit(1);
  });
}

start().catch(err => {
  console.error('[Server] Erro ao iniciar:', err);
  process.exit(1);
});

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] Encerrando por ${signal}...`);
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = app;
