import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GameCard from '../components/GameCard'
import { getGames, getStandings, getUpcomingGames } from '../api'
import { isLiveStatus } from '../utils/gameStatus'

function getSaoPauloDateString(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(part => [part.type, part.value])
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

export default function DashboardNBA() {
  const [games, setGames] = useState([])
  const [upcomingGames, setUpcomingGames] = useState([])
  const [standings, setStandings] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const todayDate = getSaoPauloDateString()

  useEffect(() => {
    async function load() {
      try {
        const [gamesRes, standingsRes, upcomingRes] = await Promise.all([
          getGames({ league: 'NBA', date: todayDate, limit: 100 }),
          getStandings('NBA'),
          getUpcomingGames({ league: 'NBA' })
        ])
        if (gamesRes.success) setGames(gamesRes.data || [])
        if (standingsRes.success) setStandings(standingsRes.data || {})
        if (upcomingRes.success) setUpcomingGames(upcomingRes.data || [])
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
  }, [todayDate])

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <span className="loading-text">Carregando dados da NBA...</span>
      </div>
    )
  }

  const liveGames = games.filter(g => isLiveStatus(g.status))
  const upcomingList = upcomingGames.slice(0, 6)
  
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
          <span className="stat-label">Jogos Hoje</span>
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
          <span className="stat-label">Próximos Jogos</span>
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

      {/* Upcoming Games */}
      <section>
        <h2 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 700 }}>Próximos Jogos</h2>
        <div className="games-grid">
          {upcomingList.length > 0 ? upcomingList.map(game => (
            <GameCard key={game.id} game={game} />
          )) : (
            <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>
              Nenhum jogo agendado encontrado.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
