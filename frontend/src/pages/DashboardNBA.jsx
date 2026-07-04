import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GameCard from '../components/GameCard'
import { getGames, getStandings, getUpcomingGames } from '../api'

export default function DashboardNBA() {
  const [games, setGames] = useState([])
  const [upcomingGames, setUpcomingGames] = useState([])
  const [standings, setStandings] = useState({})
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
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <span className="loading-text">Carregando dados da NBA...</span>
      </div>
    )
  }

  const liveGames = games.filter(g => 
    g.status !== 'Final' && g.status !== 'scheduled' && !String(g.status).toLowerCase().includes('final') && !String(g.status).toLowerCase().includes('schedule')
  )
  const recentGames = games.filter(g => 
    g.status === 'Final' || String(g.status).toLowerCase().includes('final')
  ).sort((a, b) => new Date(b.game_date) - new Date(a.game_date)).slice(0, 6)
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

      {/* Recent Games */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 700 }}>Últimos Resultados</h2>
        <div className="games-grid">
          {recentGames.length > 0 ? recentGames.map(game => (
            <GameCard key={game.id} game={game} />
          )) : (
            <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>
              Nenhum resultado recente. Faça uma sincronização no Admin.
            </p>
          )}
        </div>
      </section>

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
