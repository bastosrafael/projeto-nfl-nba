import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GameCard from '../components/GameCard'
import { getGames, getStandings, getUpcomingGames } from '../api'
import { isFinalStatus, isLiveStatus } from '../utils/gameStatus'

function formatWeekDate(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export default function DashboardNFL() {
  const [games, setGames] = useState([])
  const [upcomingGames, setUpcomingGames] = useState([])
  const [standings, setStandings] = useState({})
  const [displayedWeek, setDisplayedWeek] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [gamesRes, standingsRes, upcomingRes] = await Promise.all([
          getGames({ league: 'NFL', limit: 20 }),
          getStandings('NFL'),
          getUpcomingGames({ league: 'NFL' })
        ])
        if (gamesRes.success) setGames(gamesRes.data || [])
        if (standingsRes.success) setStandings(standingsRes.data || {})
        if (upcomingRes.success) {
          setUpcomingGames(upcomingRes.data || [])
          setDisplayedWeek(upcomingRes.week || null)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <span className="loading-text">Carregando dados da NFL...</span>
      </div>
    )
  }

  const liveGames = games.filter(g => isLiveStatus(g.status))
  const recentGames = games.filter(g => isFinalStatus(g.status)).sort((a, b) => new Date(b.game_date) - new Date(a.game_date)).slice(0, 6)
  
  const totalTeams = Object.values(standings).flat().length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🏈 NFL</h1>
          <p className="subtitle">National Football League - Dashboard em tempo real</p>
        </div>
        <Link to="/standings?league=NFL" className="btn btn-nfl">
          Ver Classificação Completa →
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total de Jogos</span>
          <span className="stat-value nfl">{games.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ao Vivo</span>
          <span className="stat-value nfl">{liveGames.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Times</span>
          <span className="stat-value nfl">{totalTeams || 32}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Jogos na Semana</span>
          <span className="stat-value nfl">{upcomingGames.length}</span>
        </div>
      </div>

      {/* Live */}
      {liveGames.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 700 }}>🔴 Ao Vivo</h2>
          <div className="games-grid">
            {liveGames.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 700 }}>Últimos Resultados</h2>
        <div className="games-grid">
          {recentGames.length > 0 ? recentGames.map(game => (
            <GameCard key={game.id} game={game} />
          )) : (
            <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>
              Nenhum resultado recente.
            </p>
          )}
        </div>
      </section>

      {/* Upcoming */}
      <section>
        <h2 style={{ marginBottom: '4px', fontSize: '1.2rem', fontWeight: 700 }}>Jogos da Semana</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          {displayedWeek
            ? `${displayedWeek.mode === 'first_scheduled' ? 'Primeira semana da temporada regular' : 'Semana atual'}: ${formatWeekDate(displayedWeek.start_date)} a ${formatWeekDate(displayedWeek.end_date)}. Atualização automática.`
            : 'De segunda a domingo, com atualização automática.'}
        </p>
        <div className="games-grid">
          {upcomingGames.length > 0 ? upcomingGames.map(game => (
            <GameCard key={game.id} game={game} />
          )) : (
            <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>
              Nenhum jogo agendado nesta semana.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
