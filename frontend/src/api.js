const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`;

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY = 1500;
const REQUEST_TIMEOUT = 60000;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchApi(endpoint, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        signal: controller.signal
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} em ${endpoint}`);
      }
      const data = await res.json();
      clearTimeout(timer);
      return data;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      const isClientError = error.message && error.message.startsWith('HTTP 4');
      if (isClientError || attempt === MAX_ATTEMPTS - 1) break;
      await delay(RETRY_BASE_DELAY * (attempt + 1));
    }
  }
  console.error(`API Error (${endpoint}) apos ${MAX_ATTEMPTS} tentativas:`, lastError);
  return { success: false, error: lastError?.message || 'Erro de conexao' };
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
