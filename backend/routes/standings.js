const express = require('express');
const { queryAll } = require('../db/init');
const router = express.Router();
router.get('/', async (req, res) => {
  let sql = `SELECT s.*, t.logo_url, t.conference, t.division FROM standings s JOIN teams t ON t.id = s.team_id WHERE 1=1`; const params = [];
  if (req.query.league) { sql += ' AND s.league = ?'; params.push(req.query.league.toUpperCase()); } sql += ' ORDER BY s.league, s.win_pct DESC, s.wins DESC';
  try { const standings = await queryAll(sql, params); const grouped = {}; for (const entry of standings) { const key = entry.conference || 'Geral'; (grouped[key] ||= []).push(entry); } res.json({ success: true, data: grouped }); }
  catch (error) { res.status(500).json({ success: false, error: error.message }); }
});
module.exports = router;