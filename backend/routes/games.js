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

async function findScheduledGames(league, startDate, endDate, limit) {
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

router.get('/', async (req, res) => {
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
    const games = await queryAll(sql, params);
    res.json({ success: true, data: games, count: games.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/live', async (req, res) => {
  try {
    const games = await queryAll(`
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

router.get('/nfl/schedule', async (req, res) => {
  try {
    const requestedSeason = parseInt(req.query.season, 10);
    const seasonRows = Number.isFinite(requestedSeason)
      ? await queryAll(`
          SELECT DISTINCT season_year, season_type
          FROM games
          WHERE league = 'NFL'
            AND season_year = ?
            AND season_type = 2
            AND season_week IS NOT NULL
          LIMIT 1
        `, [requestedSeason])
      : await queryAll(`
          SELECT season_year, season_type
          FROM games
          WHERE league = 'NFL'
            AND season_type = 2
            AND season_week IS NOT NULL
          ORDER BY season_year DESC
          LIMIT 1
        `);

    const season = seasonRows[0];
    if (!season) {
      return res.json({ success: true, season: null, data: [], count: 0 });
    }

    const weeks = await queryAll(`
      SELECT season_year, season_type, season_week, start_date, end_date
      FROM nfl_schedule_weeks
      WHERE season_year = ? AND season_type = ?
      ORDER BY season_week ASC
    `, [season.season_year, season.season_type]);

    const games = await queryAll(`
      SELECT * FROM games
      WHERE league = 'NFL'
        AND season_year = ?
        AND season_type = ?
        AND season_week IS NOT NULL
      ORDER BY season_week ASC, game_date ASC, game_time ASC, id ASC
    `, [season.season_year, season.season_type]);

    const gamesByWeek = new Map();
    for (const game of games) {
      if (!gamesByWeek.has(game.season_week)) gamesByWeek.set(game.season_week, []);
      gamesByWeek.get(game.season_week).push(game);
    }

    const schedule = weeks.map(week => ({
      season_year: week.season_year,
      season_type: week.season_type,
      season_week: week.season_week,
      start_date: week.start_date,
      end_date: week.end_date,
      games: gamesByWeek.get(week.season_week) || []
    }));

    return res.json({
      success: true,
      season: {
        year: season.season_year,
        type: season.season_type
      },
      data: schedule,
      count: games.length
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(300, parseInt(req.query.limit) || 200));
    const requestedLeague = req.query.league?.toUpperCase();
    const league = ['NBA', 'NFL'].includes(requestedLeague) ? requestedLeague : null;
    const today = getBrazilDateString();
    let { startDate, endDate } = getWeekRangeForDate(today);
    let mode = 'current';
    let games = await findScheduledGames(league, startDate, endDate, limit);

    if (games.length === 0 && league) {
      const firstRows = await queryAll(`
        SELECT MIN(game_date) AS first_date
        FROM games
        WHERE league = ?
          AND LOWER(status) LIKE '%scheduled%'
      `, [league]);
      const firstDate = firstRows[0]?.first_date;

      if (firstDate && today < firstDate) {
        ({ startDate, endDate } = getWeekRangeForDate(firstDate));
        games = await findScheduledGames(league, startDate, endDate, limit);
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
