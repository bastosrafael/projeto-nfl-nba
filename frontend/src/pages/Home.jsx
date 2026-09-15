import { useState, useEffect, useRef, useCallback } from 'react'
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
  const [refreshing, setRefreshing] = useState(false)
  const [nbaError, setNbaError] = useState(null)
  const cancelledRef = useRef(false)
  const retryTimerRef = useRef(null)
  const attemptRef = useRef(0)
  const emptyRetryRef = useRef(0)
  const dataReadyRef = useRef(false)
  const todayDate = getSaoPauloDateString()

  const finishFirstLoad = useCallback(() => {
    dataReadyRef.current = true
    setLoading(false)
  }, [])

  const fetchAll = useCallback(async () => {
    try {
      const [nbaRes, nflRes, liveRes, nbaUpcomingRes, nflUpcomingRes] = await Promise.all([
        getGames({ league: 'NBA', date: todayDate, limit: 100 }),
        getGames({ league: 'NFL', date: todayDate, limit: 100 }),
        getLiveGames(),
        getUpcomingGames({ league: 'NBA' }),
        getUpcomingGames({ league: 'NFL' })
      ])
      if (cancelledRef.current) return

      if (nflRes.success) setNflGames(nflRes.data || [])
      if (liveRes.success) setLiveGames(liveRes.data || [])
      if (nbaUpcomingRes.success) setNbaUpcomingGames(nbaUpcomingRes.data || [])
      if (nflUpcomingRes.success) setNflUpcomingGames(nflUpcomingRes.data || [])

      if (!nbaRes.success) {
        throw new Error(nbaRes.error || 'Falha ao buscar jogos NBA de hoje')
      }

      const games = nbaRes.data || []

      setNbaGames(games)
      setNbaError(null)
      attemptRef.current = 0

      const firstLoadCold = !dataReadyRef.current && emptyRetryRef.current < 2
      if (games.length === 0 && firstLoadCold) {
        emptyRetryRef.current++
        retryTimerRef.current = setTimeout(fetchAll, 2000 * emptyRetryRef.current)
        return
      }

      finishFirstLoad()
    } catch (err) {
      console.error(err)
      if (cancelledRef.current) return
      if (attemptRef.current < 3) {
        attemptRef.current++
        setNbaError(
          `Não foi possível carregar os jogos NBA. Nova tentativa (${attemptRef.current}/3) em andamento...`
        )
        retryTimerRef.current = setTimeout(fetchAll, 2000 * attemptRef.current)
      } else {
        setNbaError('Não foi possível carregar os jogos NBA. Verifique a conexão e use "Atualizar jogos".')
      }
    }
  }, [todayDate, finishFirstLoad])

  useEffect(() => {
    cancelledRef.current = false
    attemptRef.current = 0
    emptyRetryRef.current = 0
    fetchAll()

    const interval = setInterval(fetchAll, 30000)
    return () => {
      cancelledRef.current = true
      clearInterval(interval)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [fetchAll])

  const handleRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    attemptRef.current = 0
    try {
      await fetchAll()
    } finally {
      if (!cancelledRef.current) setRefreshing(false)
    }
  }, [fetchAll, refreshing])

  const nbaLive = liveGames.filter(game => game.league === 'NBA')
  const nflLive = liveGames.filter(game => game.league === 'NFL')
  const nbaTodayList = [...nbaGames].sort(sortByGameTime).slice(0, 3)
  const nflTodayList = [...nflGames].sort(sortByGameTime).slice(0, 3)
  const nbaUpcomingList = nbaUpcomingGames.slice(0, 3)
  const nflUpcomingList = nflUpcomingGames.slice(0, 3)
  const nflUpcomingWeek = nflUpcomingGames[0]?.season_week ?? null

  const liveCount = nbaLive.length + nflLive.length
  const todayCount = nbaGames.length + nflGames.length

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <span className="loading-text">
          {refreshing ? 'Atualizando jogos...' : 'Carregando jogos NBA...'}
        </span>
        {nbaError && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{nbaError}</span>
        )}
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

      <div
        className="section-actions"
        style={{ justifyContent: 'flex-end', marginBottom: '16px' }}
      >
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Atualizando...' : 'Atualizar jogos'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <span className="stat-label">
            <span className="label-full">Jogos de Hoje</span>
            <span className="label-short">Jogos</span>
          </span>
          <span className="stat-value" style={{ color: 'var(--accent-blue)' }}>
            {todayCount}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔴</span>
          <span className="stat-label">
            <span className="label-full">Ao Vivo</span>
            <span className="label-short">Ao Vivo</span>
          </span>
          <span className="stat-value" style={{ color: liveCount > 0 ? 'var(--error)' : 'var(--text-muted)' }}>
            {liveCount || '0'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏀</span>
          <span className="stat-label">
            <span className="label-full">NBA Hoje</span>
            <span className="label-short">NBA</span>
          </span>
          <span className="stat-value nba">{nbaGames.length} jogos</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏈</span>
          <span className="stat-label">
            <span className="label-full">NFL Hoje</span>
            <span className="label-short">NFL</span>
          </span>
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
            <h2 className="section-title"><span className="section-title-icon">🏀 </span>NBA</h2>
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
          <div className="card empty-state" style={{ marginBottom: '20px', textAlign: 'center', padding: '32px' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
              <span className="empty-state-icon">🏀 </span>
              {nbaError
                ? nbaError
                : refreshing
                  ? 'Atualizando jogos NBA...'
                  : 'Sem jogos NBA hoje'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {nbaError
                ? 'Nova tentativa automática em andamento. Você também pode usar o botão "Atualizar jogos".'
                : refreshing
                  ? 'Buscando as informações mais recentes...'
                  : 'Quando houver jogos no dia, eles aparecem aqui.'}
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
            <h2 className="section-title"><span className="section-title-icon">🏈 </span>NFL</h2>
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
          <div className="card empty-state" style={{ marginBottom: '20px', textAlign: 'center', padding: '32px' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
              <span className="empty-state-icon">🏈 </span>
              {refreshing ? 'Atualizando jogos NFL...' : 'Sem jogos NFL hoje'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {refreshing
                ? 'Buscando as informações mais recentes...'
                : 'Quando houver jogos no dia, eles aparecem aqui.'}
            </p>
          </div>
        )}

        {nflUpcomingList.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 className="section-subheading">
              {nflUpcomingWeek ? `Próximos Jogos — Semana ${nflUpcomingWeek}` : 'Próximos Jogos'}</h3>
            <div className="games-grid">
              {nflUpcomingList.map(game => <GameCard key={game.id} game={game} />)}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
