const axios = require('axios');

require('dotenv').config();

const NFL_API_URL = process.env.NFL_API_URL || 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const NBA_API_URL = process.env.NBA_API_URL || 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';

const api = axios.create({ timeout: 15000 });

const NOT_AVAILABLE = 'Não disponível';

const POSITION_NOTES = {
  QB: { label: 'Quarterback', note: 'Responsável pelos passes e comando do ataque.' },
  RB: { label: 'Running Back', note: 'Responsável principalmente pelas corridas.' },
  WR: { label: 'Wide Receiver', note: 'Responsável por receber passes.' }
};

const NFL_STAT_CATEGORIES = new Set(['passing', 'rushing', 'receiving']);
const NBA_LEADER_ORDER = ['points', 'assists', 'rebounds'];

function safeStr(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  return String(value).trim();
}

function athleteBrief(athlete) {
  if (!athlete) return null;
  return {
    id: safeStr(athlete.id),
    name: safeStr(athlete.displayName) || safeStr(athlete.fullName) || NOT_AVAILABLE,
    position: safeStr(athlete.position && athlete.position.abbreviation) || null,
    jersey: safeStr(athlete.jersey),
    headshot: safeStr(athlete.headshot && athlete.headshot.href)
  };
}

function collectPositions(...sources) {
  const positions = new Set();
  for (const list of sources) {
    for (const item of list || []) {
      if (item && item.position && POSITION_NOTES[item.position]) positions.add(item.position);
    }
  }
  return Array.from(positions).sort();
}

function buildPositionNotes(positions) {
  return Object.fromEntries(
    positions
      .filter(pos => POSITION_NOTES[pos])
      .map(pos => [pos, POSITION_NOTES[pos]])
  );
}

async function fetchEventSummary(url) {
  try {
    const { data } = await api.get(url);
    return data && typeof data === 'object' ? data : null;
  } catch (error) {
    console.error('[GameSummary] Erro ao buscar resumo ESPN:', error.message);
    return null;
  }
}

function normalizeHeader(summary, league) {
  const header = summary.header || {};
  const comp = Array.isArray(header.competitions) && header.competitions[0]
    ? header.competitions[0]
    : null;
  const statusType = comp && comp.status && comp.status.type ? comp.status.type : null;
  const broadcastSource = summary.broadcasts
    || (comp && comp.broadcasts)
    || [];

  const broadcast = broadcastSource
    .map(b => Array.isArray(b.names) ? b.names.join(', ') : safeStr(b.name))
    .filter(Boolean)
    .join(', ');

  const teamA = comp && Array.isArray(comp.competitors) ? comp.competitors[0] : null;
  const teamB = comp && Array.isArray(comp.competitors) ? comp.competitors[1] : null;
  const home = (comp && comp.homeAwayAvailable !== false && teamA && teamA.homeAway === 'home') ? teamA : teamB;
  const opponent = home === teamA ? teamB : teamA;

  return {
    status: statusType ? safeStr(statusType.name) : null,
    isFinal: Boolean(statusType && statusType.completed),
    date: comp && comp.date ? comp.date : null,
    broadcast: broadcast || null,
    teams: {
      home: {
        name: home ? (safeStr(home.team && home.team.displayName) || null) : null,
        abbreviation: home ? (safeStr(home.team && home.team.abbreviation) || null) : null,
        logo: home ? safeStr(home.team && home.team.logo) : null
      },
      away: {
        name: opponent ? (safeStr(opponent.team && opponent.team.displayName) || null) : null,
        abbreviation: opponent ? (safeStr(opponent.team && opponent.team.abbreviation) || null) : null,
        logo: opponent ? safeStr(opponent.team && opponent.team.logo) : null
      }
    },
    score: {
      home: home && safeStr(home.score) !== null ? Number(home.score) : null,
      away: opponent && safeStr(opponent.score) !== null ? Number(opponent.score) : null
    },
    league
  };
}

function extractVenue(summary) {
  const venue = summary.gameInfo && summary.gameInfo.venue
    ? summary.gameInfo.venue
    : null;
  if (!venue) return { name: null, city: null, state: null };

  return {
    name: safeStr(venue.fullName),
    city: safeStr(venue.address && venue.address.city),
    state: safeStr(venue.address && venue.address.state)
  };
}

function normalizeTopLeaders(leadersRaw) {
  const out = [];
  for (const teamLeaders of leadersRaw || []) {
    const teamName = teamLeaders.team ? (safeStr(teamLeaders.team.displayName)) : null;
    for (const category of teamLeaders.leaders || []) {
      const name = safeStr(category.displayName) || safeStr(category.name);
      const best = Array.isArray(category.leaders) && category.leaders.length
        ? category.leaders[0]
        : null;
      if (!name || !best) continue;

      out.push({
        team: teamName,
        category: name,
        displayValue: safeStr(best.displayValue) || null,
        value: typeof best.value === 'number' ? best.value : null,
        athlete: athleteBrief(best.athlete)
      });
    }
  }
  return out;
}

function chooseLeader(leaders) {
  if (!leaders.length) return null;

  const nbaOrder = { points: 0, assists: 1, rebounds: 2 };
  const sorted = [...leaders].sort((a, b) => {
    const rankA = a.category && Object.prototype.hasOwnProperty.call(nbaOrder, a.category.toLowerCase())
      ? nbaOrder[a.category.toLowerCase()] : 10;
    const rankB = b.category && Object.prototype.hasOwnProperty.call(nbaOrder, b.category.toLowerCase())
      ? nbaOrder[b.category.toLowerCase()] : 10;
    if (rankA !== rankB) return rankA - rankB;
    return (b.value || 0) - (a.value || 0);
  });

  const best = sorted[0];
  if (!best || !best.athlete) return null;

  return {
    athlete: best.athlete,
    stats: [{ label: best.category, value: best.displayValue || NOT_AVAILABLE }],
    team: best.team
  };
}

function normalizeSummary(summary, game, league) {
  if (!summary) return null;

  const header = normalizeHeader(summary, league);
  const venue = extractVenue(summary);
  const leaders = normalizeTopLeaders(summary.leaders);
  const leader = chooseLeader(leaders);

  const stats = [];
  const positionsSeen = [];
  const boxPlayers = summary.boxscore && summary.boxscore.players
    ? summary.boxscore.players
    : [];

  if (league === 'NFL') {
    for (const teamBox of boxPlayers) {
      const teamName = teamBox.team ? safeStr(teamBox.team.displayName) : null;
      for (const category of teamBox.statistics || []) {
        const catName = safeStr(category.name);
        if (!catName || !NFL_STAT_CATEGORIES.has(catName)) continue;

        const athletes = (category.athletes || [])
          .slice(0, 3)
          .map(a => ({
            ...athleteBrief(a.athlete),
            stats: (category.labels || [])
              .map((label, i) => ({ label, value: safeStr(a.stats && a.stats[i]) }))
              .filter(s => s.value !== null)
          }));

        athletes.forEach(a => positionsSeen.push(a));

        stats.push({
          team: teamName || NOT_AVAILABLE,
          category: catName,
          title: safeStr(category.text) || `${catName}`,
          athletes
        });
      }
    }
  } else {
    for (const teamBox of boxPlayers) {
      const teamName = teamBox.team ? safeStr(teamBox.team.displayName) : null;
      for (const category of teamBox.statistics || []) {
        const statsPlayers = (category.athletes || [])
          .filter(a => a.athlete)
          .sort((a, b) => {
            const toNum = s => parseInt(String(s), 10) || 0;
            return toNum(b.stats && b.stats[1]) - toNum(a.stats && a.stats[1]);
          })
          .slice(0, 10)
          .map(a => ({
            ...athleteBrief(a.athlete),
            stats: (category.labels || [])
              .map((label, i) => ({ label, value: safeStr(a.stats && a.stats[i]) }))
              .filter(s => s.value !== null)
          }));

        statsPlayers.forEach(a => positionsSeen.push(a));

        stats.push({
          team: teamName || NOT_AVAILABLE,
          category: 'team',
          title: `${teamName || NOT_AVAILABLE} — Jogadores`,
          labels: (category.labels || []),
          athletes: statsPlayers
        });
      }
    }
  }

  const positionNotes = league === 'NFL'
    ? buildPositionNotes(collectPositions(
      leaders.map(l => l.athlete),
      [leader && leader.athlete],
      stats.flatMap(s => s.athletes || [])
    ))
    : {};

  return {
    game: {
      id: game.id,
      league: game.league || league,
      home_team: header.teams.home.name || game.home_team,
      away_team: header.teams.away.name || game.away_team,
      home_score: header.score.home !== null ? header.score.home : game.home_score,
      away_score: header.score.away !== null ? header.score.away : game.away_score
    },
    status: header.status || game.status || null,
    status_final: header.isFinal,
    venue: venue.name || NOT_AVAILABLE,
    venue_city: venue.city,
    venue_state: venue.state,
    broadcast: header.broadcast || game.broadcast || null,
    date: header.date || game.game_date || null,
    leader,
    stats,
    positionNotes,
    available: Boolean(header.isFinal && (stats.length > 0 || leader))
  };
}

async function getGameSummary(game) {
  if (!game || !game.id || !game.league) return null;

  const league = (game.league || '').toUpperCase();
  const url = league === 'NFL'
    ? `${NFL_API_URL}/summary?event=${game.id}`
    : league === 'NBA'
      ? `${NBA_API_URL}/summary?event=${game.id}`
      : null;

  if (!url) return null;

  const summary = await fetchEventSummary(url);
  if (!summary) return null;

  return normalizeSummary(summary, game, league);
}

module.exports = {
  getGameSummary,
  NOT_AVAILABLE
};
