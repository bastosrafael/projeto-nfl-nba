const axios = require('axios');
require('dotenv').config();

const NBA_SITE_API_URL = process.env.NBA_SITE_API_URL || 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const NBA_CORE_API_URL = process.env.NBA_CORE_API_URL || 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';

const siteApi = axios.create({
  baseURL: NBA_SITE_API_URL,
  timeout: 20000
});

const coreApi = axios.create({
  baseURL: NBA_CORE_API_URL,
  timeout: 20000
});

const NBA_CONFERENCE_MAP = {
  ATL: { conference: 'Eastern', division: 'Southeast' },
  BOS: { conference: 'Eastern', division: 'Atlantic' },
  BKN: { conference: 'Eastern', division: 'Atlantic' },
  CHA: { conference: 'Eastern', division: 'Southeast' },
  CHI: { conference: 'Eastern', division: 'Central' },
  CLE: { conference: 'Eastern', division: 'Central' },
  DET: { conference: 'Eastern', division: 'Central' },
  IND: { conference: 'Eastern', division: 'Central' },
  MIA: { conference: 'Eastern', division: 'Southeast' },
  MIL: { conference: 'Eastern', division: 'Central' },
  NYK: { conference: 'Eastern', division: 'Atlantic' },
  ORL: { conference: 'Eastern', division: 'Southeast' },
  PHI: { conference: 'Eastern', division: 'Atlantic' },
  TOR: { conference: 'Eastern', division: 'Atlantic' },
  WAS: { conference: 'Eastern', division: 'Southeast' },
  DAL: { conference: 'Western', division: 'Southwest' },
  DEN: { conference: 'Western', division: 'Northwest' },
  GSW: { conference: 'Western', division: 'Pacific' },
  GS: { conference: 'Western', division: 'Pacific' },
  HOU: { conference: 'Western', division: 'Southwest' },
  LAC: { conference: 'Western', division: 'Pacific' },
  LAL: { conference: 'Western', division: 'Pacific' },
  MEM: { conference: 'Western', division: 'Southwest' },
  MIN: { conference: 'Western', division: 'Northwest' },
  NOP: { conference: 'Western', division: 'Southwest' },
  NO: { conference: 'Western', division: 'Southwest' },
  OKC: { conference: 'Western', division: 'Northwest' },
  PHX: { conference: 'Western', division: 'Pacific' },
  POR: { conference: 'Western', division: 'Northwest' },
  SAC: { conference: 'Western', division: 'Pacific' },
  SAS: { conference: 'Western', division: 'Southwest' },
  SA: { conference: 'Western', division: 'Southwest' },
  UTA: { conference: 'Western', division: 'Northwest' },
  UTAH: { conference: 'Western', division: 'Northwest' },
  NY: { conference: 'Eastern', division: 'Atlantic' },
  WSH: { conference: 'Eastern', division: 'Southeast' }
};

async function getCurrentSeason() {
  try {
    const { data } = await coreApi.get('/seasons?limit=10');
    const seasonRefs = data.items || [];
    if (seasonRefs.length === 0) {
      return null;
    }

    const now = Date.now();
    const regularSeasons = [];

    for (const ref of seasonRefs) {
      const seasonUrl = ref.$ref.replace('http://', 'https://');
      const { data: season } = await axios.get(seasonUrl, { timeout: 20000 });
      const start = Date.parse(season.type?.startDate);
      const end = Date.parse(season.type?.endDate);

      if (Number(season.type?.type) === 2 && Number.isFinite(start) && Number.isFinite(end)) {
        regularSeasons.push({ season, start, end });
      }
    }

    const activeSeason = regularSeasons.find(({ start, end }) => now >= start && now <= end);
    if (activeSeason) return activeSeason.season;

    const upcomingSeasons = regularSeasons
      .filter(({ start }) => start > now)
      .sort((a, b) => a.start - b.start);
    return upcomingSeasons[0]?.season || null;
  } catch (error) {
    console.error('[NBA] Erro ao buscar temporada atual:', error.message);
    return null;
  }
}

async function getTeams() {
  try {
    const season = await getCurrentSeason();
    if (!season?.year) return [];

    const { data } = await coreApi.get(`/seasons/${season.year}/teams?limit=100`);
    const teamRefs = data.items || [];
    const teams = [];

    for (const ref of teamRefs) {
      const teamUrl = ref.$ref.replace('http://', 'https://');
      const { data: team } = await axios.get(teamUrl, { timeout: 20000 });
      const meta = NBA_CONFERENCE_MAP[team.abbreviation] || { conference: '', division: '' };

      teams.push({
        id: parseInt(team.id, 10),
        name: team.displayName,
        display_name: team.displayName,
        abbreviation: team.abbreviation,
        conference: meta.conference,
        division: meta.division,
        logo_url: team.logos?.find(logo => logo.rel?.includes('scoreboard'))?.href
          || team.logos?.[0]?.href
          || null
      });
    }

    return teams;
  } catch (error) {
    console.error('[NBA] Erro ao buscar times:', error.message);
    return [];
  }
}

function toBrazilDateParts(dateStr) {
  if (!dateStr) return { date: '', time: '' };

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

async function getGames() {
  try {
    const season = await getCurrentSeason();
    if (!season?.type?.startDate || !season?.type?.endDate) return [];

    const start = new Date(season.type.startDate);
    const end = new Date(season.type.endDate);
    const windows = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const windowStart = new Date(cursor);
      const windowEnd = new Date(cursor);
      windowEnd.setDate(windowEnd.getDate() + 30);
      if (windowEnd > end) windowEnd.setTime(end.getTime());
      windows.push({
        start: windowStart.toISOString().slice(0, 10).replace(/-/g, ''),
        end: windowEnd.toISOString().slice(0, 10).replace(/-/g, '')
      });
      cursor.setDate(cursor.getDate() + 31);
    }

    const allGames = [];
    const seen = new Set();

    for (const window of windows) {
      const { data } = await siteApi.get('/scoreboard', {
        params: {
          dates: `${window.start}-${window.end}`,
          limit: 1000
        }
      });

      for (const event of data.events || []) {
        if (Number(event.season?.type) !== 2) continue;
        if (seen.has(event.id)) continue;
        seen.add(event.id);
        allGames.push(event);
      }
    }

    return allGames;
  } catch (error) {
    console.error('[NBA] Erro ao buscar jogos:', error.message);
    return [];
  }
}

function extractGames(scoreboardData) {
  const games = [];
  try {
    for (const event of scoreboardData || []) {
      const comp = event.competitions?.[0];
      if (!comp) continue;

      const competitors = comp.competitors || [];
      const home = competitors.find(c => c.homeAway === 'home');
      const away = competitors.find(c => c.homeAway === 'away');
      const statusType = comp.status?.type || {};
      const isLive = statusType.state === 'in';
      const { date, time } = toBrazilDateParts(event.date);

      games.push({
        id: parseInt(event.id, 10),
        home_team: home?.team?.displayName || 'Time Casa',
        away_team: away?.team?.displayName || 'Time Fora',
        home_team_id: parseInt(home?.team?.id || 0, 10),
        away_team_id: parseInt(away?.team?.id || 0, 10),
        home_score: parseInt(home?.score || 0, 10),
        away_score: parseInt(away?.score || 0, 10),
        status: statusType.name || 'STATUS_SCHEDULED',
        period: isLive ? (comp.status?.displayClock || statusType.shortDetail || '') : '',
        game_time: time,
        game_date: date,
        venue: comp.venue?.fullName || '',
        venue_city: comp.venue?.address?.city || '',
        venue_state: comp.venue?.address?.state || ''
      });
    }
  } catch (error) {
    console.error('[NBA] Erro ao extrair jogos:', error.message);
  }
  return games;
}

module.exports = { getCurrentSeason, getTeams, getGames, extractGames };
