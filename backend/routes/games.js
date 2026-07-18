const express = require('express');
const router = express.Router();
const { queryAll } = require('../db/init');

function getBrazilDateString(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date).map(part => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftIsoDate(dateString, days) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getWeekRangeForDate(dateString) {
  const weekday = new Date(`${dateString}T12:00:00Z`).getUTCDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  const startDate = shiftIsoDate(dateString, -daysSinceMonday);

  return {
    startDate,
    endDate: shiftIsoDate(startDate, 6)
  };
}

function getCurrentWeekRange() {
  return getWeekRangeForDate(getBrazilDateString());
}

function findScheduledGames(league, startDate, endDate, limit) {
  const params = [startDate, endDate];
  let sql = `
    SELECT * FROM games
    WHERE LOWER(status) LIKE '%scheduled%'
      AND game_date BETWEEN ? AND ?
  `;

  if (league) {
    sql += ' AND league = ?';
    params.push(league);
  }

  sql += ' ORDER BY game_date ASC, game_time ASC, id ASC LIMIT ?';
  params.push(limit);
  return queryAll(sql, params);
}

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
    const requestedLeague = req.query.league?.toUpperCase();
    const league = ['NBA', 'NFL'].includes(requestedLeague) ? requestedLeague : null;
    const today = getBrazilDateString();
    let { startDate, endDate } = getCurrentWeekRange();
    let mode = 'current';
    let games = findScheduledGames(league, startDate, endDate, limit);

    if (games.length === 0 && league) {
      const firstRows = queryAll(`
        SELECT MIN(game_date) AS first_date
        FROM games
        WHERE league = ?
          AND LOWER(status) LIKE '%scheduled%'
      `, [league]);
      const firstDate = firstRows[0]?.first_date;

      if (firstDate && today < firstDate) {
        ({ startDate, endDate } = getWeekRangeForDate(firstDate));
        games = findScheduledGames(league, startDate, endDate, limit);
        mode = 'first_scheduled';
      }
    }

    res.json({
      success: true,
      data: games,
      count: games.length,
      week: { start_date: startDate, end_date: endDate, mode }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
