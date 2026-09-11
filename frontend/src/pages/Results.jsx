import { useState, useEffect } from 'react'
import GameCard from '../components/GameCard'
import GameSummary from '../components/GameSummary'
import { getGames } from '../api'
import { isFinalStatus } from '../utils/gameStatus'

function FinalGamesSection({ league, games, loading, onOpenSummary }) {
  return (
    <section className="results-section">
      <h2 className="results-section-title">
        {league === 'NFL' ? '🏈 NFL' : '🏀 NBA'}
      </h2>
      {loading ? (
        <div className="loading">
          <div className="loading-spinner" />
          <span className="loading-text">Carregando jogos...</span>
        </div>
      ) : games.length > 0 ? (
        <div className="games-grid">
          {games.map(game => (
            <GameCard
              key={`${game.league}-${game.id}`}
              game={game}
              onSelect={onOpenSummary}
            />
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            Nenhum resultado disponível no momento.
          </p>
        </div>
      )}
    </section>
  )
}

export default function Results() {
  const [nflGames, setNflGames] = useState([])
  const [nbaGames, setNbaGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [nflRes, nbaRes] = await Promise.all([
          getGames({ league: 'NFL', status: 'final', limit: 100 }),
          getGames({ league: 'NBA', status: 'final', limit: 100 })
        ])
        setNflGames((nflRes.data || []).filter(g => isFinalStatus(g.status)))
        setNbaGames((nbaRes.data || []).filter(g => isFinalStatus(g.status)))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const total = nflGames.length + nbaGames.length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Resultados</h1>
          <p className="subtitle">Resultados de jogos finalizados NBA e NFL</p>
        </div>
        <span className="status-badge final">✅ {total} finalizados</span>
      </div>

      <FinalGamesSection league="NFL" games={nflGames} loading={loading} onOpenSummary={setSelectedGame} />
      <FinalGamesSection league="NBA" games={nbaGames} loading={loading} onOpenSummary={setSelectedGame} />

      {selectedGame && (
        <GameSummary
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  )
}
