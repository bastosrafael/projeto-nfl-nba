const STATUS_LABELS = {
  'Final': 'Final',
  'STATUS_FINAL': 'Final',
  'scheduled': 'Agendado',
  'STATUS_SCHEDULED': 'Agendado',
  'in_progress': 'Ao Vivo',
  'STATUS_IN_PROGRESS': 'Ao Vivo',
  'halftime': 'Intervalo',
  'STATUS_HALFTIME': 'Intervalo',
}

function getStatusClass(status) {
  if (!status) return 'scheduled'
  const s = status.toLowerCase()
  if (s.includes('final')) return 'final'
  if (s.includes('progress') || s.includes('live') || s.includes('halftime')) return 'live'
  return 'scheduled'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${String(parseInt(d)).padStart(2, '0')}/${String(parseInt(m)).padStart(2, '0')}`
}

function formatVenue(game) {
  const parts = []
  if (game.venue) parts.push(game.venue)
  const location = [game.venue_city, game.venue_state].filter(Boolean).join(', ')
  if (location) parts.push(location)
  return parts.join(' • ')
}

export default function GameCard({ game }) {
  const statusClass = getStatusClass(game.status)
  const statusLabel = STATUS_LABELS[game.status] || game.status || 'Agendado'
  const isFinal = statusClass === 'final'
  const isLive = statusClass === 'live'
  
  return (
    <div className="card game-card">
      <div className="game-header">
        <span className={`game-league ${game.league?.toLowerCase()}`}>
          {game.league}
        </span>
        <span className={`game-status ${isLive ? 'live' : ''}`}>
          {isLive && '🔴 '}{statusLabel}
          {game.period && ` • ${game.period}`}
        </span>
      </div>
      
      <div className="teams">
        <div className="team">
          <span className="team-name">{game.away_team}</span>
          <span className={`team-score ${isFinal && game.away_score > game.home_score ? 'winner' : ''}`}>
            {game.away_score || (isFinal ? 0 : '-')}
          </span>
        </div>
        <div className="vs">
          {isLive ? 'VS' : (isFinal ? '×' : 'VS')}
        </div>
        <div className="team">
          <span className="team-name">{game.home_team}</span>
          <span className={`team-score ${isFinal && game.home_score > game.away_score ? 'winner' : ''}`}>
            {game.home_score || (isFinal ? 0 : '-')}
          </span>
        </div>
      </div>
      
      {(game.venue || game.venue_city || game.venue_state || game.period || game.game_time) && (
        <div className="game-info">
          {formatVenue(game) && <span className="game-venue">{formatVenue(game)}</span>}
          {((game.game_time || game.period) && (game.game_time || game.period) !== '0:00') && (
            <span className="game-time">{game.game_time || game.period}</span>
          )}
        </div>
      )}
      <div className="game-date">
        {formatDate(game.game_date)}
        {game.game_time ? ` • ${game.game_time}` : ''}
      </div>
    </div>
  )
}
