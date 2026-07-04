const express = require('express');
const router = express.Router();
const { queryAll } = require('../db/init');

router.get('/', (req, res) => {
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
  
  sql += ' ORDER BY s.league, s.win_pct DESC, s.wins DESC';
  
  try {
    const standings = queryAll(sql, params);
    
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
