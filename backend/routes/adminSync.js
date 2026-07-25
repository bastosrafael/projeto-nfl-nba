const express = require('express');
const { getDb, getSyncLogs, queryOne, saveDb } = require('../db/init');
const { syncAll, syncNBA, syncNFL } = require('../sync/syncGames');
const { updateStandings } = require('../sync/syncStandings');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const VALID_LEAGUES = ['NBA', 'NFL', 'ALL'];

router.post('/sync', async (req, res) => {
  try {
    const { league = 'all' } = req.body;
    const leagueUpper = league.toUpperCase();
    
    if (!VALID_LEAGUES.includes(leagueUpper)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Liga invalida. Use NBA, NFL ou all.' 
      });
    }
    
    if (leagueUpper === 'NBA') {
      await syncNBA();
    } else if (leagueUpper === 'NFL') {
      await syncNFL();
    } else {
      await syncAll();
    }
    
    await updateStandings();
    
    res.json({ success: true, message: 'Sincronizacao concluida!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/logs', (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 30));
    const logs = getSyncLogs(limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/status', (req, res) => {
  try {
    const nbaTeams = queryOne("SELECT COUNT(*) as count FROM teams WHERE league = 'NBA'")?.count || 0;
    const nflTeams = queryOne("SELECT COUNT(*) as count FROM teams WHERE league = 'NFL'")?.count || 0;
    const nbaGames = queryOne("SELECT COUNT(*) as count FROM games WHERE league = 'NBA'")?.count || 0;
    const nflGames = queryOne("SELECT COUNT(*) as count FROM games WHERE league = 'NFL'")?.count || 0;
    const lastSync = queryOne("SELECT created_at FROM sync_log ORDER BY created_at DESC LIMIT 1")?.created_at || 'Nunca';
    
    const dbPath = path.join(__dirname, '../db/sports.db');
    const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
    
    res.json({ success: true, data: {
      nba_teams: nbaTeams,
      nfl_teams: nflTeams,
      nba_games: nbaGames,
      nfl_games: nflGames,
      last_sync: lastSync,
      db_size: dbSize
    }});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
