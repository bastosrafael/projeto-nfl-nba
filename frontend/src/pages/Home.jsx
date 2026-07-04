import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GameCard from '../components/GameCard'
import { getGames, getLiveGames, getUpcomingGames } from '../api'

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

function sortByGameTime(a, b) {
  return (a.game_time || '99:99').localeCompare(b.game_time || '99:99')
}

export default function Home() {
  const [nbaGames, setNbaGames] = useState([])
  const [nflGames, setNflGames] = useState([])
  const [liveGames, setLiveGames] = useState([])
  const [nbaUpcomingGames, setNbaUpcomingGames] = useState([])
  const [nflUpcomingGames, setNflUpcomingGames] = useState([])
  const [loading, setLoading] = useState(true)
  const todayDate = getSaoPauloDateString()

  useEffect(() => {
    async function load() {
      try {
        const [nbaRes, nflRes, liveRes, nbaUpcomingRes, nflUpcomingRes] = await Promise.all([
          getGames({ league: 'NBA', date: todayDate, limit: 100 }),
          getGames({ league: 'NFL', date: todayDate, limit: 100 }),
          getLiveGames(),
          getUpcomingGames({ league: 'NBA' }),
          getUpcomingGames({ league: 'NFL' })
        ])

        if (nbaRes.success) setNbaGames(nbaRes.data || [])
        if (nflRes.success) setNflGames(nflRes.data || [])
        if (liveRes.success) setLiveGames(liveRes.data || [])
        if (nbaUpcomingRes.success) setNbaUpcomingGames(nbaUpcomingRes.data || [])
        if (nflUpcomingRes.success) setNflUpcomingGames(nflUpcomingRes.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [todayDate])

  const nbaLive = liveGames.filter(game => game.league === 'NBA')
  const nflLive = liveGames.filter(game => game.league === 'NFL')
  const nbaTodayList = [...nbaGames].sort(sortByGameTime).slice(0, 3)
  const nflTodayList = [...nflGames].sort(sortByGameTime).slice(0, 3)
  const nbaUpcomingList = nbaUpcomingGames.slice(0, 3)
  const nflUpcomingList = nflUpcomingGames.slice(0, 3)

  const liveCount = nbaLive.length + nflLive.length
  const todayCount = nbaGames.length + nflGames.length

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <span className="loading-text">Carregando...</span>
      </div>
    )
  }

  return (
    <div>
      <div className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-title">
            NBA + NFL <span className="highlight">Tracker</span>
          </h1>
          <p className="home-subtitle">
            Acompanhe os jogos de hoje, os jogos ao vivo, resultados e classificacao das principais ligas de esporte dos EUA em tempo real.
          </p>
          <div className="home-hero-actions">
            <Link to="/live" className="btn btn-primary">
              {liveCount > 0 ? 'Jogos Ao Vivo' : 'Ver Jogos de Hoje'}
            </Link>
            <Link to="/standings" className="btn btn-ghost">
              Classificacao
            </Link>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Jogos de Hoje</span>
          <span className="stat-value" style={{ color: 'var(--accent-blue)' }}>
            {todayCount}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ao Vivo</span>
          <span className="stat-value" style={{ color: liveCount > 0 ? 'var(--error)' : 'var(--text-muted)' }}>
            {liveCount || '0'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">NBA Hoje</span>
          <span className="stat-value nba">{nbaGames.length} jogos</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">NFL Hoje</span>
          <span className="stat-value nfl">{nflGames.length} jogos</span>
        </div>
      </div>

      {liveCount > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <div className="live-alert">
            <span className="live-dot" />
            <span>
              <strong>{liveCount} jogo(s) ao vivo agora!</strong>
            </span>
            <Link
              to="/live"
              className="btn btn-primary"
              style={{ marginLeft: 'auto', padding: '6px 16px', fontSize: '0.8rem' }}
            >
              Assistir →
            </Link>
          </div>
        </section>
      )}

      <section style={{ marginBottom: '40px' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">NBA</h2>
            <p className="section-subtitle">National Basketball Association</p>
          </div>
          <div className="section-actions">
            <Link
              to="/standings?league=NBA"
              className="btn btn-ghost"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              Classificacao
            </Link>
            <Link
              to="/nba"
              className="btn btn-nba"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              Dashboard →
            </Link>
          </div>
        </div>

        {nbaLive.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 className="section-subheading live">Ao Vivo</h3>
            <div className="games-grid">
              {nbaLive.map(game => <GameCard key={game.id} game={game} />)}
            </div>
          </div>
        )}

        {nbaTodayList.length > 0 ? (
          <div style={{ marginBottom: '20px' }}>
            <h3 className="section-subheading">Jogos de Hoje</h3>
            <div className="games-grid">
              {nbaTodayList.map(game => <GameCard key={game.id} game={game} />)}
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: '20px', textAlign: 'center', padding: '32px' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Sem jogos NBA hoje</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Quando houver jogos no dia, eles aparecem aqui.
            </p>
          </div>
        )}

        {nbaUpcomingList.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 className="section-subheading">Próximos Jogos</h3>
            <div className="games-grid">
              {nbaUpcomingList.map(game => <GameCard key={game.id} game={game} />)}
            </div>
          </div>
        )}
      </section>

      <section style={{ marginBottom: '40px' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">NFL</h2>
            <p className="section-subtitle">National Football League</p>
          </div>
          <div className="section-actions">
            <Link
              to="/standings?league=NFL"
              className="btn btn-ghost"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              Classificacao
            </Link>
            <Link
              to="/nfl"
              className="btn btn-nfl"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              Dashboard →
            </Link>
          </div>
        </div>

        {nflLive.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 className="section-subheading live">Ao Vivo</h3>
            <div className="games-grid">
              {nflLive.map(game => <GameCard key={game.id} game={game} />)}
            </div>
          </div>
        )}

        {nflTodayList.length > 0 ? (
          <div style={{ marginBottom: '20px' }}>
            <h3 className="section-subheading">Jogos de Hoje</h3>
            <div className="games-grid">
              {nflTodayList.map(game => <GameCard key={game.id} game={game} />)}
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: '20px', textAlign: 'center', padding: '32px' }}>
            <p style={{ color: 'var(--text-muted)' }}>Nenhum jogo NFL hoje.</p>
          </div>
        )}

        {nflUpcomingList.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 className="section-subheading">Próximos Jogos</h3>
            <div className="games-grid">
              {nflUpcomingList.map(game => <GameCard key={game.id} game={game} />)}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
