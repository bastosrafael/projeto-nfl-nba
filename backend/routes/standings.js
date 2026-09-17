const express = require('express');
const router = express.Router();
const { queryAll } = require('../db');

router.get('/', async (req, res) => {
  const { league } = req.query;
  
  let sql = `
    SELECT s.*, t.logo_url, t.conference, t.division
    FROM standings s
    JOIN teams t ON t.id = s.team_id
    WHERE 1=1
  `;
  const params = [];
  
  if (league) {
    sql += ' AND s.league = ?';
    params.push(league.toUpperCase());
  }
  
  sql += ` ORDER BY
    s.league,
    t.conference,
    CASE WHEN s.conference_rank > 0 THEN s.conference_rank ELSE 9999 END,
    s.win_pct DESC,
    s.wins DESC,
    s.losses ASC,
    (s.points_for - s.points_against) DESC,
    s.team ASC
  `;
  
  try {
    const standings = await queryAll(sql, params);
    
    const grouped = {};
    for (const entry of standings) {
      const key = entry.conference || 'Geral';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    }
    
    res.json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
