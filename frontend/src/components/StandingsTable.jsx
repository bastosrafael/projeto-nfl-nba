export default function StandingsTable({ standings, league }) {
  const conferenceLabels = {
    Eastern: 'Leste',
    Western: 'Oeste',
    AFC: 'AFC',
    NFC: 'NFC',
    Geral: 'Geral'
  }

  if (!standings || Object.keys(standings).length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Nenhum dado de classificação disponível ainda.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
          Faça uma sincronização no painel Admin para buscar os dados.
        </p>
      </div>
    )
  }
  
  return (
    <div>
      {Object.entries(standings).map(([conference, teams]) => (
        <div key={conference} className="conference-section">
          <h2>{conferenceLabels[conference] || conference}</h2>
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
                {teams.map((team, index) => {
                  const rankClass = index === 0 ? 'top-1' : index === 1 ? 'top-2' : index === 2 ? 'top-3' : 'other'
                  const ptDiff = (team.points_for || 0) - (team.points_against || 0)
                  
                  return (
                    <tr key={team.id}>
                      <td>
                        <span className={`rank-badge ${rankClass}`}>{index + 1}</span>
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
