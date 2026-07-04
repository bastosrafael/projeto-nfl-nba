const axios = require('axios');
require('dotenv').config();

const NFL_API_URL = process.env.NFL_API_URL || 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

const api = axios.create({
  timeout: 15000
});

const NFL_TEAM_META = {
  ARI: { conference: 'NFC', division: 'NFC West' },
  ATL: { conference: 'NFC', division: 'NFC South' },
  BAL: { conference: 'AFC', division: 'AFC North' },
  BUF: { conference: 'AFC', division: 'AFC East' },
  CAR: { conference: 'NFC', division: 'NFC South' },
  CHI: { conference: 'NFC', division: 'NFC North' },
  CIN: { conference: 'AFC', division: 'AFC North' },
  CLE: { conference: 'AFC', division: 'AFC North' },
  DAL: { conference: 'NFC', division: 'NFC East' },
  DEN: { conference: 'AFC', division: 'AFC West' },
  DET: { conference: 'NFC', division: 'NFC North' },
  GB: { conference: 'NFC', division: 'NFC North' },
  HOU: { conference: 'AFC', division: 'AFC South' },
  IND: { conference: 'AFC', division: 'AFC South' },
  JAX: { conference: 'AFC', division: 'AFC South' },
  KC: { conference: 'AFC', division: 'AFC West' },
  LV: { conference: 'AFC', division: 'AFC West' },
  LAC: { conference: 'AFC', division: 'AFC West' },
  LAR: { conference: 'NFC', division: 'NFC West' },
  MIA: { conference: 'AFC', division: 'AFC East' },
  MIN: { conference: 'NFC', division: 'NFC North' },
  NE: { conference: 'AFC', division: 'AFC East' },
  NO: { conference: 'NFC', division: 'NFC South' },
  NYG: { conference: 'NFC', division: 'NFC East' },
  NYJ: { conference: 'AFC', division: 'AFC East' },
  PHI: { conference: 'NFC', division: 'NFC East' },
  PIT: { conference: 'AFC', division: 'AFC North' },
  SF: { conference: 'NFC', division: 'NFC West' },
  SEA: { conference: 'NFC', division: 'NFC West' },
  TB: { conference: 'NFC', division: 'NFC South' },
  TEN: { conference: 'AFC', division: 'AFC South' },
  WAS: { conference: 'NFC', division: 'NFC East' },
  WSH: { conference: 'NFC', division: 'NFC East' }
};

function toBrazilDateParts(dateStr) {
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

async function getScoreboard() {
  try {
    const { data } = await api.get(`${NFL_API_URL}/scoreboard`);
    return data;
  } catch (error) {
    console.error('[NFL] Erro ao buscar scoreboard:', error.message);
    return { events: [] };
  }
}

async function getSeasonGames() {
  try {
    const { data: calendarData } = await api.get(`${NFL_API_URL}/scoreboard`);
    const league = calendarData?.leagues?.[0];
    const regularSeason = league?.calendar?.find(entry => entry.value === '2');

    if (!regularSeason?.startDate || !regularSeason?.endDate) {
      return await getScoreboard();
    }

    const startDate = regularSeason.startDate.slice(0, 10).replace(/-/g, '');
    const endDate = regularSeason.endDate.slice(0, 10).replace(/-/g, '');

    const { data } = await api.get(`${NFL_API_URL}/scoreboard`, {
      params: {
        dates: `${startDate}-${endDate}`,
        limit: 1000
      }
    });

    return data;
  } catch (error) {
    console.error('[NFL] Erro ao buscar calendario completo:', error.message);
    return { events: [] };
  }
}

async function getTeams() {
  try {
    const { data } = await api.get(`${NFL_API_URL}/teams`);
    return data;
  } catch (error) {
    console.error('[NFL] Erro ao buscar times:', error.message);
    return { sports: [{ leagues: [{ teams: [] }] }] };
  }
}

async function getStandings() {
  try {
    const { data } = await api.get(`https://cdn.espn.com/core/nfl/standings?xhr=1`);
    return data;
  } catch (error) {
    console.error('[NFL] Erro ao buscar classificacao:', error.message);
    return null;
  }
}

/**
 * Extrai times da resposta da ESPN e padroniza o formato
 */
function extractTeams(espnData) {
  const teams = [];
  try {
    const league = espnData.sports[0].leagues[0];
    for (const teamEntry of league.teams) {
      const t = teamEntry.team;
      const meta = NFL_TEAM_META[t.abbreviation] || { conference: '', division: '' };
      teams.push({
        id: t.id,
        name: t.displayName,
        display_name: t.displayName,
        abbreviation: t.abbreviation,
        conference: meta.conference,
        division: meta.division,
        logo_url: t.logos?.[0]?.href || null
      });
    }
  } catch (e) {
    console.error('[NFL] Erro ao extrair times:', e.message);
  }
  return teams;
}

/**
 * Extrai jogos do scoreboard da ESPN
 */
function extractGames(scoreboardData) {
  const games = [];
  try {
    for (const event of scoreboardData.events) {
      const comp = event.competitions[0];
      const competitors = comp.competitors || [];
      const home = competitors.find(c => c.homeAway === 'home');
      const away = competitors.find(c => c.homeAway === 'away');
      const { date, time } = toBrazilDateParts(event.date);
      const isLive = comp.status?.type?.state === 'in';
      const isFinal = comp.status?.type?.state === 'post';
      
      games.push({
        id: parseInt(event.id),
        home_team: home?.team?.displayName || 'Time Casa',
        away_team: away?.team?.displayName || 'Time Fora',
        home_team_id: parseInt(home?.team?.id || 0),
        away_team_id: parseInt(away?.team?.id || 0),
        home_score: parseInt(home?.score || 0),
        away_score: parseInt(away?.score || 0),
        status: comp.status?.type?.name || 'scheduled',
        period: isLive ? (comp.status?.displayClock || '') : '',
        game_time: time,
        game_date: date,
        venue: comp.venue?.fullName || '',
        venue_city: comp.venue?.address?.city || '',
        venue_state: comp.venue?.address?.state || '',
        completed: isFinal
      });
    }
  } catch (e) {
    console.error('[NFL] Erro ao extrair jogos:', e.message);
  }
  return games;
}

module.exports = { getScoreboard, getSeasonGames, getTeams, getStandings, extractTeams, extractGames };
