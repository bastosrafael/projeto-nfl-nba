const { getDb, logSync, saveDb } = require('../db/init');

function toBrazilDateParts(dateStr) {
  if (!dateStr) {
    return { date: '', time: '' };
  }

  const date = new Date(dateStr);
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const dateParts = Object.fromEntries(
    dateFormatter.formatToParts(date).map(part => [part.type, part.value])
  );
  const timeParts = Object.fromEntries(
    timeFormatter.formatToParts(date).map(part => [part.type, part.value])
  );

  return {
    date: `${dateParts.year}-${dateParts.month}-${dateParts.day}`,
    time: `${timeParts.hour}:${timeParts.minute}`
  };
}
const nbaService = require('../services/nbaService');
const nflService = require('../services/nflService');
const { updateStandings } = require('./syncStandings');

function leagueTeamId(league, id) {
  const parsed = parseInt(id, 10);
  if (!Number.isFinite(parsed)) return null;
  return league === 'NBA' ? 100000 + parsed : parsed;
}

async function syncNBA() {
  console.log('[Sync] Iniciando sincronizacao NBA...');
  let db;
  try {
    db = await getDb();
    db.run("DELETE FROM games WHERE league = 'NBA'");
    db.run("DELETE FROM teams WHERE league = 'NBA'");
    const nbaTeams = await nbaService.getTeams();
    
    for (const t of nbaTeams) {
      const teamId = leagueTeamId('NBA', t.id);
      db.run(`INSERT OR REPLACE INTO teams (id, name, display_name, abbreviation, league, conference, division, updated_at)
        VALUES (?, ?, ?, ?, 'NBA', ?, ?, CURRENT_TIMESTAMP)`, [
        teamId, t.display_name || t.name, t.display_name || t.name, t.abbreviation,
        t.conference || '', t.division || ''
      ]);
    }
    console.log(`[Sync] NBA: ${nbaTeams.length} times`);
    
    const nbaGames = await nbaService.getGames();
    const nbaGameRows = nbaService.extractGames(nbaGames);
    for (const g of nbaGameRows) {
      const homeTeamId = leagueTeamId('NBA', g.home_team_id);
      const awayTeamId = leagueTeamId('NBA', g.away_team_id);
      db.run(`INSERT OR REPLACE INTO games (id, league, home_team_id, away_team_id, home_team, away_team,
        home_score, away_score, status, period, game_date, game_time, venue, venue_city, venue_state, updated_at)
        VALUES (?, 'NBA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [
        g.id, homeTeamId || null, awayTeamId || null,
        g.home_team || 'Time Casa', g.away_team || 'Time Fora',
        g.home_score || 0, g.away_score || 0,
        g.status || 'STATUS_SCHEDULED', g.period?.toString() || '', g.game_date, g.game_time, g.venue || '', g.venue_city || '', g.venue_state || ''
      ]);
    }
    console.log(`[Sync] NBA: ${nbaGameRows.length} jogos`);
    logSync('NBA', 'success', `${nbaTeams.length} times, ${nbaGameRows.length} jogos`);
  } catch (error) {
    console.error('[Sync] Erro NBA:', error.message);
    logSync('NBA', 'error', error.message);
  }
  saveDb();
}

async function syncNFL() {
  console.log('[Sync] Iniciando sincronizacao NFL...');
  let db;
  try {
    db = await getDb();
    db.run("DELETE FROM games WHERE league = 'NFL'");
    db.run("DELETE FROM teams WHERE league = 'NFL'");
    const [teamsData, scoreboardData] = await Promise.all([
      nflService.getTeams(), nflService.getSeasonGames()
    ]);
    
    const nflTeams = nflService.extractTeams(teamsData);
    for (const t of nflTeams) {
      if (t.id) {
        const teamId = leagueTeamId('NFL', t.id);
        db.run(`INSERT OR REPLACE INTO teams (id, name, display_name, abbreviation, league, conference, division, logo_url, updated_at)
          VALUES (?, ?, ?, ?, 'NFL', ?, ?, ?, CURRENT_TIMESTAMP)`,
          [teamId, t.name, t.display_name, t.abbreviation, t.conference || '', t.division || '', t.logo_url]);
      }
    }
    console.log(`[Sync] NFL: ${nflTeams.length} times`);
    
    const nflGames = nflService.extractGames(scoreboardData);
    for (const g of nflGames) {
      const homeTeamId = leagueTeamId('NFL', g.home_team_id);
      const awayTeamId = leagueTeamId('NFL', g.away_team_id);
      db.run(`INSERT OR REPLACE INTO games (id, league, home_team_id, away_team_id, home_team, away_team,
        home_score, away_score, status, period, game_date, game_time, venue, venue_city, venue_state, updated_at)
        VALUES (?, 'NFL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [
        g.id, homeTeamId || null, awayTeamId || null,
        g.home_team, g.away_team, g.home_score, g.away_score,
        g.status, g.period, g.game_date, g.game_time, g.venue, g.venue_city || '', g.venue_state || ''
      ]);
    }
    console.log(`[Sync] NFL: ${nflGames.length} jogos`);
    logSync('NFL', 'success', `${nflTeams.length} times, ${nflGames.length} jogos`);
  } catch (error) {
    console.error('[Sync] Erro NFL:', error.message);
    logSync('NFL', 'error', error.message);
  }
  saveDb();
}

async function syncAll() {
  console.log('=== Sincronizacao Completa ===');
  await syncNBA();
  await syncNFL();
  await updateStandings();
  console.log('=== Sincronizacao Finalizada ===');
}

module.exports = { syncNBA, syncNFL, syncAll };
