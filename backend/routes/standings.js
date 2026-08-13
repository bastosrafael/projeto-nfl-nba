const express = require('express');
const { queryAll } = require('../db/init');

const router = express.Router();

function clearPreseasonStats(entry) {
  return {
    ...entry,
    wins: 0,
    losses: 0,
    draws: 0,
    points_for: 0,
    points_against: 0,
    streak: null,
    conference_rank: 0,
    division_rank: 0,
    win_pct: 0,
    games_played: 0
  };
}

router.get('/', async (req, res) => {
  const league = req.query.league?.toUpperCase();
  const params = [];
  let sql = `
    SELECT s.*, t.logo_url, t.conference, t.division
    FROM standings s
    JOIN teams t ON t.id = s.team_id
    WHERE 1 = 1
  `;

  if (league) {
    sql += ' AND s.league = ?';
    params.push(league);
  }

  sql += ' ORDER BY s.league, s.win_pct DESC, s.wins DESC, s.team ASC';

  try {
    let standings = await queryAll(sql, params);

    if (league === 'NBA') {
      const completedGames = await queryAll(`
        SELECT id
        FROM games
        WHERE league = 'NBA'
          AND (
            LOWER(status) LIKE '%final%'
            OR LOWER(status) LIKE '%completed%'
            OR LOWER(status) LIKE '%post%'
          )
        LIMIT 1
      `);

      if (completedGames.length === 0) {
        standings = standings
          .map(clearPreseasonStats)
          .sort((a, b) => a.team.localeCompare(b.team));
      }
    }

    const grouped = {};
    for (const entry of standings) {
      const key = entry.conference || 'Geral';
      (grouped[key] ||= []).push(entry);
    }

    res.json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
