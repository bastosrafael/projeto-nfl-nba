import { useState, useEffect } from 'react'
import GameCard from '../components/GameCard'
import { getGames } from '../api'
import { isFinalStatus, isLiveStatus, isScheduledStatus } from '../utils/gameStatus'

export default function LiveGames() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function load() {
      try {
        const [nbaRes, nflRes] = await Promise.all([
          getGames({ league: 'NBA' }),
          getGames({ league: 'NFL' })
        ])
        const allGames = [
          ...(nbaRes.data || []),
          ...(nflRes.data || [])
        ]
        setGames(allGames)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 20000)
    return () => clearInterval(interval)
  }, [])

  function getFilteredGames() {
    if (filter === 'nba') return games.filter(g => g.league === 'NBA')
    if (filter === 'nfl') return games.filter(g => g.league === 'NFL')
    if (filter === 'live') return games.filter(g => isLiveStatus(g.status))
    if (filter === 'recent') return games.filter(g => isFinalStatus(g.status))
    if (filter === 'upcoming') return games.filter(g => isScheduledStatus(g.status))
    return games // 'all'
  }

  const liveGames = games.filter(g => isLiveStatus(g.status))
  
  const recentGames = games.filter(g => isFinalStatus(g.status))
  
  const upcomingGames = games.filter(g => isScheduledStatus(g.status))

  const displayGames = getFilteredGames()

  const tabs = [
    { key: 'all', label: 'Todos' },
    { key: 'nba', label: 'NBA' },
    { key: 'nfl', label: 'NFL' },
    { key: 'live', label: '🔴 Ao Vivo' },
    { key: 'recent', label: 'Finalizados' },
    { key: 'upcoming', label: 'Agendados' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>📅 Jogos</h1>
          <p className="subtitle">Todos os jogos NBA e NFL em um só lugar</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="status-badge live">🔴 {liveGames.length} ao vivo</span>
          <span className="status-badge scheduled">📅 {upcomingGames.length} agendados</span>
          <span className="status-badge final">✅ {recentGames.length} finalizados</span>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab ${filter === tab.key ? 'active' : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner" />
          <span className="loading-text">Carregando jogos...</span>
        </div>
      ) : displayGames.length > 0 ? (
        <div className="games-grid">
          {displayGames.map(game => (
            <GameCard key={`${game.league}-${game.id}`} game={game} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>🏀🏈</p>
          <p style={{ color: 'var(--text-muted)' }}>
            Nenhum jogo encontrado. Faça uma sincronização no painel Admin.
          </p>
        </div>
      )}
    </div>
  )
}
