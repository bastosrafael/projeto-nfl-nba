import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GameCard from '../components/GameCard'
import { getGames, getStandings, getUpcomingGames } from '../api'
import { isLiveStatus } from '../utils/gameStatus'

function formatWeekDate(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export default function DashboardNBA() {
  const [games, setGames] = useState([])
  const [upcomingGames, setUpcomingGames] = useState([])
  const [standings, setStandings] = useState({})
  const [displayedWeek, setDisplayedWeek] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [gamesRes, standingsRes, upcomingRes] = await Promise.all([
          getGames({ league: 'NBA', limit: 20 }),
          getStandings('NBA'),
          getUpcomingGames({ league: 'NBA' })
        ])
        if (gamesRes.success) setGames(gamesRes.data || [])
        if (standingsRes.success) setStandings(standingsRes.data || {})
        if (upcomingRes.success) {
          setUpcomingGames(upcomingRes.data || [])
          setDisplayedWeek(upcomingRes.week || null)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
    
    // Auto refresh a cada 30s
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <span className="loading-text">Carregando dados da NBA...</span>
      </div>
    )
  }

  const liveGames = games.filter(g => isLiveStatus(g.status))
  const recentGames = []
  const upcomingList = upcomingGames
  
  // Estatísticas
  const totalTeams = Object.values(standings).flat().length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🏀 NBA</h1>
          <p className="subtitle">National Basketball Association - Dashboard em tempo real</p>
        </div>
        <Link to="/standings?league=NBA" className="btn btn-nba">
          Ver Classificação Completa →
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total de Jogos</span>
          <span className="stat-value nba">{games.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ao Vivo</span>
          <span className="stat-value nba">{liveGames.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Times</span>
          <span className="stat-value nba">{totalTeams || 30}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Jogos na Semana</span>
          <span className="stat-value nba">{upcomingList.length}</span>
        </div>
      </div>

      {/* Live Games */}
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

      {/* Recent Games */}
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

      {/* Upcoming Games */}
      <section>
        <h2 style={{ marginBottom: '4px', fontSize: '1.2rem', fontWeight: 700 }}>Jogos da Semana</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          {displayedWeek
            ? `${displayedWeek.mode === 'first_scheduled' ? 'Primeira semana da temporada regular' : 'Semana atual'}: ${formatWeekDate(displayedWeek.start_date)} a ${formatWeekDate(displayedWeek.end_date)}. Atualização automática.`
            : 'De segunda a domingo, com atualização automática.'}
        </p>
        <div className="games-grid">
          {upcomingList.length > 0 ? upcomingList.map(game => (
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
