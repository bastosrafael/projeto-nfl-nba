import { useEffect, useState } from 'react'

const NFL_STATS = [
  {
    abbrev: 'C/ATT',
    label: 'Passes completos / tentativas de passe',
    explanation: 'Quantos passes o quarterback completou e quantos tentou.',
    example: '7/28 significa 7 passes completos em 28 tentativas.',
  },
  {
    abbrev: 'YDS',
    label: 'Jardas conquistadas',
    explanation: 'Total de jardas avançadas pelo jogador ou equipe.',
  },
  {
    abbrev: 'AVG',
    label: 'Média de jardas por tentativa',
    explanation: 'Jardas divididas pelo número de tentativas (passe ou corrida).',
  },
  {
    abbrev: 'TD',
    label: 'Touchdowns marcados',
    explanation: 'Quantas vezes o jogador atravessou a linha de gol como marcação.',
  },
  {
    abbrev: 'INT',
    label: 'Interceptações',
    explanation: 'Passes lançados pelo quarterback e capturados pela defesa.',
  },
  {
    abbrev: 'SACKS',
    label: 'Derrubadas do quarterback',
    explanation: 'Quantidade de vezes que o quarterback foi derrubado atrás da linha de scrimmage.',
  },
  {
    abbrev: 'QBR',
    label: 'Total Quarterback Rating (ESPN)',
    explanation: 'Índice de desempenho do quarterback criado pela ESPN, de 0 a 100.',
  },
  {
    abbrev: 'RTG',
    label: 'Passer Rating',
    explanation: 'Nota de eficiência do quarterback calculada pela NFL, em uma escala de 0 a 158,3.',
  },
  {
    abbrev: 'CAR',
    label: 'Corridas / carregadas',
    explanation: 'Quantidade de corridas/carregadas com a bola pelo corredor ou quarterback.',
  },
  {
    abbrev: 'LONG',
    label: 'Maior jogada',
    explanation: 'A maior jogada em jardas realizada na partida.',
  },
]

export default function StatsGlossary({ gameLeague }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  if (gameLeague && gameLeague !== 'NFL') return null

  return (
    <>
      <button
        type="button"
        className="stats-glossary-btn"
        onClick={() => setOpen(true)}
      >
        ℹ️ Entenda as estatísticas
      </button>

      {open && (
        <div
          className="summary-overlay stats-glossary-overlay"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="summary-modal stats-glossary-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Dicionário de estatísticas da NFL"
            onClick={e => e.stopPropagation()}
          >
            <header className="summary-header stats-glossary-header">
              <h2 className="stats-glossary-title">🏈 Dicionário de estatísticas NFL</h2>
              <button
                type="button"
                className="summary-close"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </header>

            <div className="stats-glossary-body">
              <p className="stats-glossary-intro">
                Confira o significado das siglas mais comuns nas estatísticas de jogadores da NFL.
              </p>
              <ul className="stats-glossary-list">
                {NFL_STATS.map(stat => (
                  <li key={stat.abbrev} className="stats-glossary-item">
                    <span className="stats-glossary-abbrev">{stat.abbrev}</span>
                    <span className="stats-glossary-text">
                      <b>{stat.label}</b>
                      {stat.explanation && <span>{stat.explanation}</span>}
                      {stat.example && (
                        <span className="stats-glossary-example">Exemplo: {stat.example}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
