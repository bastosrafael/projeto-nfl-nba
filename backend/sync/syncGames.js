const { getDb, run, transaction, logSync, saveDb } = require('../db');

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
  console.log('[SYNC NBA] Buscando dados na ESPN...');
  try {
    await getDb();

    const nbaTeams = await nbaService.getTeams();
    const nbaGames = await nbaService.getGames();
    const nbaGameRows = nbaService.extractGames(nbaGames);

    const teamsValid = Array.isArray(nbaTeams) && nbaTeams.length > 0;
    const gamesValid = nbaGameRows.length > 0;

    if (!teamsValid && !gamesValid) {
      throw new Error('ESPN nao retornou times nem jogos da NBA. Dados existentes preservados.');
    }

    if (!teamsValid) {
      console.warn('[SYNC NBA] Times nao retornados pela ESPN. Times existentes preservados, atualizando apenas jogos.');
    }
    if (!gamesValid) {
      console.warn('[SYNC NBA] Jogos vazios ignorados. Dados existentes preservados.');
    }

    if (gamesValid) {
      console.log(`[SYNC NBA] Dados validados: ${nbaTeams.length} times, ${nbaGameRows.length} jogos. Substituindo dados antigos...`);
    } else {
      console.log(`[SYNC NBA] Dados validados: ${nbaTeams.length} times, ${nbaGameRows.length} jogos. Atualizando apenas times...`);
    }

    await transaction(async ({ run: txRun }) => {
      if (teamsValid) {
        await txRun("DELETE FROM teams WHERE league = 'NBA'");
        for (const t of nbaTeams) {
          const teamId = leagueTeamId('NBA', t.id);
          await txRun(`INSERT INTO teams (id, name, display_name, abbreviation, league, conference, division, updated_at)
            VALUES (?, ?, ?, ?, 'NBA', ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
              name = excluded.name,
              display_name = excluded.display_name,
              abbreviation = excluded.abbreviation,
              league = excluded.league,
              conference = excluded.conference,
              division = excluded.division,
              updated_at = CURRENT_TIMESTAMP`, [
            teamId, t.display_name || t.name, t.display_name || t.name, t.abbreviation,
            t.conference || '', t.division || ''
          ]);
        }
      }

      if (gamesValid) {
        await txRun("DELETE FROM games WHERE league = 'NBA'");
        for (const g of nbaGameRows) {
          const homeTeamId = leagueTeamId('NBA', g.home_team_id);
          const awayTeamId = leagueTeamId('NBA', g.away_team_id);
          await txRun(`INSERT INTO games (id, league, home_team_id, away_team_id, home_team, away_team,
            home_score, away_score, status, period, game_date, game_time, venue, venue_city, venue_state, broadcast, updated_at)
            VALUES (?, 'NBA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
              league = excluded.league,
              home_team_id = excluded.home_team_id,
              away_team_id = excluded.away_team_id,
              home_team = excluded.home_team,
              away_team = excluded.away_team,
              home_score = excluded.home_score,
              away_score = excluded.away_score,
              status = excluded.status,
              period = excluded.period,
              game_date = excluded.game_date,
              game_time = excluded.game_time,
              venue = excluded.venue,
              venue_city = excluded.venue_city,
              venue_state = excluded.venue_state,
              broadcast = excluded.broadcast,
              updated_at = CURRENT_TIMESTAMP`, [
            g.id, homeTeamId || null, awayTeamId || null,
            g.home_team || 'Time Casa', g.away_team || 'Time Fora',
            g.home_score || 0, g.away_score || 0,
            g.status || 'STATUS_SCHEDULED', g.period?.toString() || '', g.game_date, g.game_time, g.venue || '', g.venue_city || '', g.venue_state || '',
            g.broadcast || ''
          ]);
        }
      }
    });

    console.log(`[SYNC NBA] OK: ${nbaTeams.length} times, ${nbaGameRows.length} jogos`);
    await logSync('NBA', 'success', `${nbaTeams.length} times, ${nbaGameRows.length} jogos`);
  } catch (error) {
    console.error(`[SYNC ERROR] NBA: ${error.message}`);
    await logSync('NBA', 'error', error.message);
  }
  saveDb();
}

async function syncNFL() {
  console.log('[SYNC NFL] Buscando dados na ESPN...');
  try {
    await getDb();
    const [teamsData, scoreboardData] = await Promise.all([
      nflService.getTeams(), nflService.getSeasonGames()
    ]);

    const nflTeams = nflService.extractTeams(teamsData);
    const nflGames = nflService.extractGames(scoreboardData);
    const nflWeeks = nflService.extractSeasonWeeks(scoreboardData);

    const teamsValid = nflTeams.length > 0;
    const gamesValid = nflGames.length > 0;

    if (!teamsValid && !gamesValid) {
      throw new Error('ESPN nao retornou times nem jogos da NFL. Dados existentes preservados.');
    }

    if (!teamsValid) {
      console.warn('[SYNC NFL] Times nao retornados pela ESPN. Times existentes preservados, atualizando apenas jogos.');
    }
    if (!gamesValid) {
      console.warn('[SYNC NFL] Jogos vazios ignorados. Dados existentes preservados.');
    }

    if (gamesValid) {
      console.log(`[SYNC NFL] Dados validados: ${nflTeams.length} times, ${nflGames.length} jogos. Substituindo dados antigos...`);
    } else {
      console.log(`[SYNC NFL] Dados validados: ${nflTeams.length} times, ${nflGames.length} jogos. Atualizando apenas times...`);
    }

    await transaction(async ({ run: txRun }) => {
      if (teamsValid) {
        for (const t of nflTeams) {
          if (t.id) {
            const teamId = leagueTeamId('NFL', t.id);
            await txRun(`INSERT INTO teams (id, name, display_name, abbreviation, league, conference, division, logo_url, updated_at)
              VALUES (?, ?, ?, ?, 'NFL', ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT (id) DO UPDATE SET
                name = excluded.name,
                display_name = excluded.display_name,
                abbreviation = excluded.abbreviation,
                league = excluded.league,
                conference = excluded.conference,
                division = excluded.division,
                logo_url = excluded.logo_url,
                updated_at = CURRENT_TIMESTAMP`,
              [teamId, t.name, t.display_name, t.abbreviation, t.conference || '', t.division || '', t.logo_url]);
          }
        }
      }

      if (gamesValid) {
        await txRun("DELETE FROM games WHERE league = 'NFL'");
        for (const g of nflGames) {
          const homeTeamId = leagueTeamId('NFL', g.home_team_id);
          const awayTeamId = leagueTeamId('NFL', g.away_team_id);
          await txRun(`INSERT INTO games (id, league, home_team_id, away_team_id, home_team, away_team,
            home_score, away_score, status, period, game_date, game_time, season_year, season_type, season_week,
            venue, venue_city, venue_state, broadcast, updated_at)
            VALUES (?, 'NFL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
              league = excluded.league,
              home_team_id = excluded.home_team_id,
              away_team_id = excluded.away_team_id,
              home_team = excluded.home_team,
              away_team = excluded.away_team,
              home_score = excluded.home_score,
              away_score = excluded.away_score,
              status = excluded.status,
              period = excluded.period,
              game_date = excluded.game_date,
              game_time = excluded.game_time,
              season_year = excluded.season_year,
              season_type = excluded.season_type,
              season_week = excluded.season_week,
              venue = excluded.venue,
              venue_city = excluded.venue_city,
              venue_state = excluded.venue_state,
              broadcast = excluded.broadcast,
              updated_at = CURRENT_TIMESTAMP`, [
            g.id, homeTeamId || null, awayTeamId || null,
            g.home_team, g.away_team, g.home_score, g.away_score,
            g.status, g.period, g.game_date, g.game_time, g.season_year, g.season_type, g.season_week,
            g.venue, g.venue_city || '', g.venue_state || '', g.broadcast || ''
          ]);
        }
      }

      for (const week of nflWeeks) {
        await txRun(`INSERT INTO nfl_schedule_weeks
          (season_year, season_type, season_week, start_date, end_date)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT (season_year, season_type, season_week) DO UPDATE SET
            start_date = excluded.start_date,
            end_date = excluded.end_date`, [
          week.season_year, week.season_type, week.season_week, week.start_date, week.end_date
        ]);
      }
    });

    console.log(`[SYNC NFL] OK: ${nflTeams.length} times, ${nflGames.length} jogos`);
    await logSync('NFL', 'success', `${nflTeams.length} times, ${nflGames.length} jogos`);
  } catch (error) {
    console.error(`[SYNC ERROR] NFL: ${error.message}`);
    await logSync('NFL', 'error', error.message);
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
