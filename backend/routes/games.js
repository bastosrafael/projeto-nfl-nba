const express = require('express');
const router = express.Router();
const { queryAll } = require('../db/init');

router.get('/', (req, res) => {
  const { league, status, date } = req.query;
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
  
  let sql = 'SELECT * FROM games WHERE 1=1';
  const params = [];
  
  if (league && ['NBA', 'NFL'].includes(league.toUpperCase())) {
    sql += ' AND league = ?';
    params.push(league.toUpperCase());
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (date) {
    sql += ' AND game_date = ?';
    params.push(date);
  }
  
  sql += ' ORDER BY game_date DESC, id DESC LIMIT ?';
  params.push(limit);
  
  try {
    const games = queryAll(sql, params);
    res.json({ success: true, data: games, count: games.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/live', (req, res) => {
  try {
    const games = queryAll(`
      SELECT * FROM games 
      WHERE UPPER(status) IN ('STATUS_IN_PROGRESS', 'STATUS_HALFTIME')
        OR LOWER(status) IN ('in progress', 'live', 'halftime')
      ORDER BY league, game_date DESC
    `);
    res.json({ success: true, data: games, count: games.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/upcoming', (req, res) => {
  try {
    const limit = Math.max(1, Math.min(300, parseInt(req.query.limit) || 200));
    const league = req.query.league;

    const params = [];
    let sql = `
      SELECT * FROM games
      WHERE (LOWER(status) LIKE '%scheduled%')
    `;

    if (league && ['NBA', 'NFL'].includes(league.toUpperCase())) {
      sql += ' AND league = ?';
      params.push(league.toUpperCase());
    }

    sql += ' ORDER BY game_date ASC, game_time ASC, id ASC LIMIT ?';
    params.push(limit);

    const games = queryAll(sql, params);
    res.json({ success: true, data: games, count: games.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
