const { getDb, logSync, queryAll, saveDb } = require('../db/init');

function isFinalStatus(status) {
  if (!status) return false;
  const normalized = String(status).toLowerCase();
  return normalized.includes('final') || normalized.includes('completed') || normalized.includes('post');
}

async function updateStandings() {
  console.log('[Standings] Atualizando classificacoes...');
  let db;
  try {
    db = await getDb();
    
    // NBA
    db.run("DELETE FROM standings WHERE league = 'NBA'");
    const nbaTeams = queryAll("SELECT DISTINCT t.id, t.name, t.conference, t.division FROM teams t WHERE t.league = 'NBA'");
    
    for (const team of nbaTeams) {
      const games = queryAll(
        "SELECT home_score, away_score, home_team_id, away_team_id, status FROM games WHERE (home_team_id = ? OR away_team_id = ?) AND league = 'NBA'",
        [team.id, team.id]
      );
      let wins = 0, losses = 0, pf = 0, pa = 0;
      for (const g of games) {
        if (isFinalStatus(g.status)) {
          const isHome = g.home_team_id === team.id;
          const ts = isHome ? (g.home_score||0) : (g.away_score||0);
          const os = isHome ? (g.away_score||0) : (g.home_score||0);
          pf += ts; pa += os;
          if (ts > os) wins++; else if (ts < os) losses++;
        }
      }
      const gp = wins + losses;
      const wp = gp > 0 ? wins / gp : 0;
      db.run(`INSERT INTO standings (league, team_id, team, wins, losses, draws, points_for, points_against, win_pct, games_played, conference_rank, division_rank)
        VALUES ('NBA', ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, 0)`,
        [team.id, team.name, wins, losses, pf, pa, wp, gp]);
    }
    
    // Rankings NBA
    for (const conf of ['Eastern', 'Western', 'East', 'West']) {
      const ct = queryAll(`SELECT s.id FROM standings s JOIN teams t ON t.id = s.team_id WHERE s.league = 'NBA' AND t.conference = ? ORDER BY s.win_pct DESC`, [conf]);
      ct.forEach((team, i) => db.run('UPDATE standings SET conference_rank = ? WHERE id = ?', [i + 1, team.id]));
    }
    
    // NFL
    db.run("DELETE FROM standings WHERE league = 'NFL'");
    const nflTeams = queryAll("SELECT DISTINCT t.id, t.name FROM teams t WHERE t.league = 'NFL'");
    
    for (const team of nflTeams) {
      const games = queryAll(
        "SELECT home_score, away_score, home_team_id, away_team_id, status FROM games WHERE (home_team_id = ? OR away_team_id = ?) AND league = 'NFL'",
        [team.id, team.id]
      );
      let wins = 0, losses = 0, draws = 0, pf = 0, pa = 0;
      for (const g of games) {
        if (isFinalStatus(g.status)) {
          const isHome = g.home_team_id === team.id;
          const ts = isHome ? (g.home_score||0) : (g.away_score||0);
          const os = isHome ? (g.away_score||0) : (g.home_score||0);
          pf += ts; pa += os;
          if (ts > os) wins++; else if (ts < os) losses++; else draws++;
        }
      }
      const gp = wins + losses + draws;
      const wp = gp > 0 ? wins / gp : 0;
      db.run(`INSERT INTO standings (league, team_id, team, wins, losses, draws, points_for, points_against, win_pct, games_played, conference_rank, division_rank)
        VALUES ('NFL', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        [team.id, team.name, wins, losses, draws, pf, pa, wp, gp]);
    }
    
    logSync('STANDINGS', 'success', 'NBA e NFL atualizadas');
    console.log('[Standings] OK');
  } catch (error) {
    console.error('[Standings] Erro:', error.message);
    logSync('STANDINGS', 'error', error.message);
  }
  saveDb();
}

module.exports = { updateStandings };
