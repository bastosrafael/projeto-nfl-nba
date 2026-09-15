const NBA_TEAMS = {
  'atlanta hawks': 'ATL',
  'boston celtics': 'BOS',
  'brooklyn nets': 'BKN',
  'charlotte hornets': 'CHA',
  'chicago bulls': 'CHI',
  'cleveland cavaliers': 'CLE',
  'dallas mavericks': 'DAL',
  'denver nuggets': 'DEN',
  'detroit pistons': 'DET',
  'golden state warriors': 'GSW',
  'houston rockets': 'HOU',
  'indiana pacers': 'IND',
  'los angeles clippers': 'LAC',
  'los angeles lakers': 'LAL',
  'memphis grizzlies': 'MEM',
  'miami heat': 'MIA',
  'milwaukee bucks': 'MIL',
  'minnesota timberwolves': 'MIN',
  'new orleans pelicans': 'NO',
  'new york knicks': 'NYK',
  'oklahoma city thunder': 'OKC',
  'orlando magic': 'ORL',
  'philadelphia 76ers': 'PHI',
  'phoenix suns': 'PHX',
  'portland trail blazers': 'POR',
  'sacramento kings': 'SAC',
  'san antonio spurs': 'SA',
  'toronto raptors': 'TOR',
  'utah jazz': 'UTAH',
  'washington wizards': 'WAS',
}

const NFL_TEAMS = {
  'arizona cardinals': 'ARI',
  'atlanta falcons': 'ATL',
  'baltimore ravens': 'BAL',
  'buffalo bills': 'BUF',
  'carolina panthers': 'CAR',
  'chicago bears': 'CHI',
  'cincinnati bengals': 'CIN',
  'cleveland browns': 'CLE',
  'dallas cowboys': 'DAL',
  'denver broncos': 'DEN',
  'detroit lions': 'DET',
  'green bay packers': 'GB',
  'houston texans': 'HOU',
  'indianapolis colts': 'IND',
  'jacksonville jaguars': 'JAX',
  'kansas city chiefs': 'KC',
  'las vegas raiders': 'LV',
  'los angeles chargers': 'LAC',
  'los angeles rams': 'LAR',
  'miami dolphins': 'MIA',
  'minnesota vikings': 'MIN',
  'new england patriots': 'NE',
  'new orleans saints': 'NO',
  'new york giants': 'NYG',
  'new york jets': 'NYJ',
  'philadelphia eagles': 'PHI',
  'pittsburgh steelers': 'PIT',
  'san francisco 49ers': 'SF',
  'seattle seahawks': 'SEA',
  'tampa bay buccaneers': 'TB',
  'tennessee titans': 'TEN',
  'washington commanders': 'WAS',
}

const MAPS = {
  nba: NBA_TEAMS,
  nfl: NFL_TEAMS,
}

function normalize(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getTeamAbbreviation(sport, name) {
  const league = sport?.toLowerCase()
  if (!league || !name) return null
  return MAPS[league]?.[normalize(name)] || null
}

export function getTeamInitials(name) {
  const words = normalize(name)
    .split(' ')
    .filter(word => Boolean(word))
    .slice(0, 2)
  return words.map(word => word[0].toUpperCase()).join('') || '??'
}
