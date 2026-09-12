const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`;

async function fetchApi(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    return { success: false, error: error.message };
  }
}

export function getGames(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/games?${query}`);
}

export function getLiveGames() {
  return fetchApi('/games/live');
}

export function getUpcomingGames(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/games/upcoming${query ? `?${query}` : ''}`);
}

export function getNFLSchedule(season) {
  const query = season ? `?season=${season}` : '';
  return fetchApi(`/games/nfl/schedule${query}`);
}

export function getGameSummary(gameId) {
  return fetchApi(`/games/${gameId}/summary`)
}

export function getStandings(league) {
  const query = league ? `?league=${league}` : '';
  return fetchApi(`/standings${query}`);
}

export function getHealth() {
  return fetchApi('/health');
}
