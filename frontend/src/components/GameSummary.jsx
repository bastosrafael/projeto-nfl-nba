import { useEffect, useState } from 'react'
import { getGameSummary } from '../api'
import { isFinalStatus } from '../utils/gameStatus'
import TeamLogo from './TeamLogo'
import StatsGlossary from './StatsGlossary'

const NOT_AVAILABLE = 'Não disponível'

function formatDateTime(dateStr) {
  if (!dateStr) return NOT_AVAILABLE
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function LeaderSection({ leader }) {
  if (!leader || !leader.athlete) return null

  return (
    <section className="summary-section">
      <h3 className="summary-section-title">Destaque</h3>
      <div className="summary-leader">
        {leader.athlete.headshot && (
          <img src={leader.athlete.headshot} alt={leader.athlete.name} className="summary-leader-photo" />
        )}
        <div className="summary-leader-info">
          <span className="summary-leader-name">{leader.athlete.name}</span>
          <span className="summary-leader-position">
            {leader.athlete.position || NOT_AVAILABLE}
          </span>
          {leader.team && <span className="summary-leader-team">{leader.team}</span>}
          <ul className="summary-leader-stats">
            {leader.stats.map(stat => (
              <li key={stat.label}>
                <span className="summary-stat-label">{stat.label}</span>
                <span className="summary-stat-value">{stat.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function StatsSection({ stats, league }) {
  if (!stats || stats.length === 0) {
    return <p className="summary-empty">Estatísticas: {NOT_AVAILABLE}</p>
  }

  return (
    <section className="summary-section">
      <h3 className="summary-section-title">Estatísticas</h3>
      {stats.map((group, idx) => (
        <div key={`${group.team}-${group.category}-${idx}`} className="summary-stats-group">
          <h4 className="summary-stats-title">{group.title}</h4>
          {league === 'NBA' ? (
            <>
              <div className="summary-table-head summary-table-row">
                {(group.labels || []).map((label, i) => (
                  <span key={`${label}-${i}`}>{label}</span>
                ))}
              </div>
              {(group.athletes || []).map((a, i) => (
                <div key={`${a.id}-${i}`} className="summary-table-row summary-player-row">
                  <span className="summary-player">{a.name}</span>
                  {(a.stats || []).slice(1).map(s => (
                    <span key={s.label}>{s.value}</span>
                  ))}
                </div>
              ))}
            </>
          ) : (
            <div className="summary-group-items">
              {(group.athletes || []).map((a, i) => (
                <div key={`${a.id}-${i}`} className="summary-group-item">
                  <span className="summary-player">{a.name}</span>
                  <span className="summary-player-pos">{a.position}</span>
                  <div className="summary-group-stats">
                    {(a.stats || []).map(s => (
                      <span key={`${a.id}-${s.label}`} className="summary-stat-pair">
                        <b>{s.value}</b> {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

export default function GameSummary({ game, onClose }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setSummary(null)

    async function load() {
      try {
        const res = await getGameSummary(game.id)
        if (cancelled) return
        if (res.success && res.data) {
          setSummary(res.data)
        } else {
          setError(res.error || 'Não foi possível carregar o resumo.')
        }
      } catch (err) {
        if (cancelled) return
        setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [game.id])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const done = summary && (summary.status_final || isFinalStatus(game.status))

  return (
    <div className="summary-overlay" onClick={onClose} role="presentation">
      <div
        className="summary-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Resumo do jogo ${game.away_team} x ${game.home_team}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="summary-header">
          <h2 className="summary-title">
            <span className="summary-league">{game.league}</span>
            <span className="summary-title-teams">
              <span className="summary-team-group">
                <TeamLogo sport={game.league} name={game.away_team} />
                <span className="summary-team-name">{game.away_team}</span>
                <span className="summary-team-score">
                  {game.away_score ?? <span className="summary-score-empty">-</span>}
                </span>
              </span>
              <span className="summary-vs">VS</span>
              <span className="summary-team-group">
                <span className="summary-team-score">
                  {game.home_score ?? <span className="summary-score-empty">-</span>}
                </span>
                <span className="summary-team-name">{game.home_team}</span>
                <TeamLogo sport={game.league} name={game.home_team} />
              </span>
            </span>
          </h2>
          <button type="button" className="summary-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>
        <p className="summary-status">
          {summary?.status || 'Final'}{' '}
          {done && '— Jogo Finalizado'}
        </p>
        <p className="summary-meta">
          📅 {formatDateTime(summary?.date)} | 🏟 {summary?.venue || NOT_AVAILABLE}
          {summary?.broadcast && ` | 📺 ${summary.broadcast}`}
        </p>

        {loading && (
          <div className="summary-loading">
            <span>Carregando resumo...</span>
          </div>
        )}

        {error && <p className="summary-empty">{error}</p>}

        {!loading && !error && summary && (
          <div className="summary-body">
            {summary.available ? (
              <>
                <LeaderSection leader={summary.leader} />
                <StatsSection stats={summary.stats} league={game.league} />
                {game.league === 'NFL' && <StatsGlossary gameLeague={game.league} />}
                {summary.positionNotes && Object.keys(summary.positionNotes).length > 0 && (
                  <section className="summary-section">
                    <h3 className="summary-section-title">Notas de posição</h3>
                    {Object.entries(summary.positionNotes).map(([abbrev, info]) => (
                      <p key={abbrev} className="summary-position-note">
                        <b>{abbrev} = {info.label}</b> — {info.note}
                      </p>
                    ))}
                  </section>
                )}
              </>
            ) : (
              <p className="summary-empty">Resumo {NOT_AVAILABLE}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
