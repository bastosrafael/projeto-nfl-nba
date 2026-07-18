require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { getDb } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3001;
let server = null;
let shuttingDown = false;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/games', require('./routes/games'));
app.use('/api/standings', require('./routes/standings'));

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Inicializar banco
async function start() {
  await getDb();
  console.log('[DB] Banco de dados SQLite inicializado');
  
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
  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint não encontrado.' });
  });
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
