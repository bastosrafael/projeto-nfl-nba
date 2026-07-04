import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import StandingsTable from '../components/StandingsTable'
import { getStandings } from '../api'

export default function StandingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const leagueParam = searchParams.get('league') || 'NBA'
  const [league, setLeague] = useState(leagueParam)
  const [standings, setStandings] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSearchParams({ league })
  }, [league, setSearchParams])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await getStandings(league)
        if (res.success) setStandings(res.data || {})
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [league])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🏆 Classificação</h1>
          <p className="subtitle">{league === 'NBA' ? 'National Basketball Association' : 'National Football League'}</p>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${league === 'NBA' ? 'active' : ''}`}
          onClick={() => setLeague('NBA')}
        >
          🏀 NBA
        </button>
        <button 
          className={`tab ${league === 'NFL' ? 'active' : ''}`}
          onClick={() => setLeague('NFL')}
        >
          🏈 NFL
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner" />
          <span className="loading-text">Carregando classificação...</span>
        </div>
      ) : (
        <StandingsTable standings={standings} league={league} />
      )}
    </div>
  )
}
