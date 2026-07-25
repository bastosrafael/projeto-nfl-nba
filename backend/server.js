require('dotenv').config();
const path = require('path');
const express = require('express');
const app = require('./app');
const { getDb } = require('./db/init');

async function start() {
  await getDb();
  const { syncAll } = require('./sync/syncGames');
  const interval = parseInt(process.env.SYNC_INTERVAL || '300000', 10);
  setTimeout(() => syncAll().catch(error => console.error('[Sync]', error.message)), 3000);
  setInterval(() => syncAll().catch(error => console.error('[Sync]', error.message)), interval);
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => { if (!req.path.startsWith('/api')) res.sendFile(path.join(frontendPath, 'index.html')); });
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`[Server] NFL + NBA Tracker em http://localhost:${port}`));
}
if (require.main === module) start().catch(error => { console.error(error); process.exit(1); });
module.exports = app;