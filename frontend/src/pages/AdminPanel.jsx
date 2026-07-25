import { useState, useEffect } from 'react'
import { getSystemStatus, getSyncLogs, triggerSync } from '../api'

export default function AdminPanel() {
  const [status, setStatus] = useState(null)
  const [logs, setLogs] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadData() {
    try {
      const [statusRes, logsRes] = await Promise.all([
        getSystemStatus(),
        getSyncLogs(30)
      ])
      if (statusRes.success) setStatus(statusRes.data)
      if (logsRes.success) setLogs(logsRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 15000)
    return () => clearInterval(interval)
  }, [])

  async function handleSync(league = 'all') {
    setSyncing(true)
    setSyncMessage('Sincronizando...')
    try {
      const res = await triggerSync(league)
      if (res.success) {
        setSyncMessage('✅ Sincronizado com sucesso!')
        await loadData()
      } else {
        setSyncMessage(`❌ Erro: ${res.error}`)
      }
    } catch (err) {
      setSyncMessage(`❌ Erro: ${err.message}`)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMessage(''), 5000)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>⚙️ Painel Admin</h1>
          <p className="subtitle">Gerenciar sincronização e monitorar o sistema</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="btn btn-nba" 
            onClick={() => handleSync('NBA')}
            disabled={syncing}
          >
            🔄 Sinc. NBA
          </button>
          <button 
            className="btn btn-nfl" 
            onClick={() => handleSync('NFL')}
            disabled={syncing}
          >
            🔄 Sinc. NFL
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => handleSync('all')}
            disabled={syncing}
          >
            🔄 Sincronizar Tudo
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="card" style={{ 
          marginBottom: '16px', 
          textAlign: 'center',
          background: syncMessage.includes('✅') ? 'rgba(34,197,94,0.1)' : 
                     syncMessage.includes('❌') ? 'rgba(239,68,68,0.1)' : 
                     'rgba(59,130,246,0.1)',
          borderColor: syncMessage.includes('✅') ? 'rgba(34,197,94,0.3)' : 
                      syncMessage.includes('❌') ? 'rgba(239,68,68,0.3)' : 
                      'rgba(59,130,246,0.3)'
        }}>
          {syncMessage}
        </div>
      )}

      <div className="admin-grid">
        {/* Status */}
        <div>
          <h2 style={{ marginBottom: '12px', fontSize: '1rem', fontWeight: 700 }}>📊 Status do Sistema</h2>
          {loading ? (
            <div className="loading" style={{ padding: '40px' }}>
              <div className="loading-spinner" />
            </div>
          ) : status ? (
            <div className="table-container">
              <table>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Times NBA</td>
                    <td>{status.nba_teams}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Times NFL</td>
                    <td>{status.nfl_teams}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Jogos NBA</td>
                    <td>{status.nba_games}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Jogos NFL</td>
                    <td>{status.nfl_games}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Última Sincronização</td>
                    <td>{status.last_sync || 'Nunca'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Tamanho do BD</td>
                    <td>{(status.db_size / 1024).toFixed(1)} KB</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Servidor offline. Inicie o backend.
            </div>
          )}
        </div>

        {/* Logs */}
        <div>
          <h2 style={{ marginBottom: '12px', fontSize: '1rem', fontWeight: 700 }}>📋 Logs de Sincronização</h2>
          <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Liga</th>
                  <th>Status</th>
                  <th>Mensagem</th>
                  <th>Horário</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? logs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <span className="status-badge" style={{
                        background: log.league === 'NBA' ? 'rgba(255,107,53,0.15)' : 'rgba(0,230,118,0.15)',
                        color: log.league === 'NBA' ? 'var(--accent-nba)' : 'var(--accent-nfl)'
                      }}>
                        {log.league}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${log.status === 'success' ? 'final' : log.status === 'error' ? 'live' : 'scheduled'}`}>
                        {log.status === 'success' ? '✅' : log.status === 'error' ? '❌' : '⏳'} {log.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.message || '-'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      Nenhum log encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>ℹ️ Informações do Sistema</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
          <strong>NBA API:</strong> ESPN (site.api.espn.com) — via scoreboard e endpoints core<br />
          <strong>NFL API:</strong> ESPN (site.api.espn.com) — via scoreboard<br />
          <strong>Sync automático:</strong> A cada 5 minutos (configurável via .env)<br />
          <strong>Banco:</strong> SQLite (local)<br />
          Os endpoints usados neste projeto sao publicos e nao exigem chave para o fluxo atual.
        </p>
      </div>
    </div>
  )
}
