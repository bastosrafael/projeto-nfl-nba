const API_BASE = '/api';

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

export function getStandings(league) {
  const query = league ? `?league=${league}` : '';
  return fetchApi(`/standings${query}`);
}

export function getHealth() {
  return fetchApi('/health');
}

export function getSyncLogs(limit = 20) {
  return fetchApi(`/admin/logs?limit=${limit}`);
}

export function getSystemStatus() {
  return fetchApi('/admin/status');
}

export function triggerSync(league = 'all') {
  return fetchApi('/admin/sync', {
    method: 'POST',
    body: JSON.stringify({ league })
  });
}
