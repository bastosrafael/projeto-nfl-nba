export default function StandingsTable({ standings, league }) {
  const conferenceLabels = {
    Eastern: 'Leste',
    Western: 'Oeste',
    AFC: 'AFC',
    NFC: 'NFC',
    Geral: 'Geral'
  }

  const conferenceFullNames = {
    AFC: 'American Football Conference',
    NFC: 'National Football Conference'
  }

  if (!standings || Object.keys(standings).length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Nenhum dado de classificação disponível ainda.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
          A atualização é automática e será exibida quando os dados oficiais estiverem disponíveis.
        </p>
      </div>
    )
  }
  
  return (
    <div>
      {Object.entries(standings).map(([conference, teams]) => (
        <div key={conference} className="conference-section">
          <h2>{conferenceLabels[conference] || conference}</h2>
          {conferenceFullNames[conference] && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 8px 0' }}>
              {conferenceFullNames[conference]}
            </p>
          )}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Time</th>
                  <th>J</th>
                  <th>V</th>
                  <th>D</th>
                  <th>E</th>
                  <th>%</th>
                  <th>PF</th>
                  <th>PS</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => {
                  const rank = Number(team.conference_rank) > 0 ? Number(team.conference_rank) : null
                  const rankClass = rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : 'other'
                  const ptDiff = (team.points_for || 0) - (team.points_against || 0)
                  
                  return (
                    <tr key={team.id}>
                      <td>
                        <span className={`rank-badge ${rankClass}`}>{rank ?? '-'}</span>
                      </td>
                      <td>
                        <strong>{team.team}</strong>
                      </td>
                      <td>{team.games_played}</td>
                      <td style={{ color: 'var(--success)' }}>{team.wins}</td>
                      <td style={{ color: 'var(--error)' }}>{team.losses}</td>
                      <td>{team.draws || 0}</td>
                      <td>{(team.win_pct * 100).toFixed(1)}%</td>
                      <td>{team.points_for}</td>
                      <td>{team.points_against}</td>
                      <td style={{ color: ptDiff >= 0 ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
                        {ptDiff > 0 ? '+' : ''}{ptDiff}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
