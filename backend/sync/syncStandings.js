const { getDb, run, logSync, queryAll, transaction, saveDb } = require('../db/init');

function isFinalStatus(status) {
  if (!status) return false;
  const normalized = String(status).toLowerCase();
  return normalized.includes('final') || normalized.includes('completed') || normalized.includes('post');
}

async function computeLeagueStandings(league) {
  const teams = await queryAll(
    'SELECT id, name FROM teams WHERE league = ? ORDER BY name ASC',
    [league]
  );

  const rows = [];
  for (const team of teams) {
    const games = await queryAll(
      'SELECT home_score, away_score, home_team_id, away_team_id, status FROM games WHERE (home_team_id = ? OR away_team_id = ?) AND league = ?',
      [team.id, team.id, league]
    );
    let wins = 0, losses = 0, draws = 0, pf = 0, pa = 0;
    for (const g of games) {
      if (isFinalStatus(g.status)) {
        const isHome = g.home_team_id === team.id;
        const ts = isHome ? (g.home_score || 0) : (g.away_score || 0);
        const os = isHome ? (g.away_score || 0) : (g.home_score || 0);
        pf += ts; pa += os;
        if (ts > os) wins++; else if (ts < os) losses++; else draws++;
      }
    }
    const gp = league === 'NFL' ? wins + losses + draws : wins + losses;
    const wp = gp > 0
      ? (league === 'NFL' ? (wins + (draws * 0.5)) / gp : wins / gp)
      : 0;
    rows.push([league, team.id, team.name, wins, losses, draws, pf, pa, wp, gp]);
  }
  return rows;
}

function computeConferenceRanks(rows, teamsMeta) {
  const byConference = {};
  for (const row of rows) {
    const meta = teamsMeta.get(row[1]);
    const conference = meta && meta.conference ? meta.conference : 'Geral';
    if (!byConference[conference]) byConference[conference] = [];
    byConference[conference].push(row);
  }

  for (const conference of Object.keys(byConference)) {
    byConference[conference].sort((a, b) => {
      const [, , teamA, winsA, lossesA, drawsA, pfA, paA, wpA] = a;
      const [, , teamB, winsB, lossesB, drawsB, pfB, paB, wpB] = b;
      if (wpB !== wpA) return wpB - wpA;
      if (winsB !== winsA) return winsB - winsA;
      if (lossesA !== lossesB) return lossesA - lossesB;
      if ((pfA - paA) !== (pfB - paB)) return (pfB - paB) - (pfA - paA);
      if (pfB !== pfA) return pfB - pfA;
      return teamA.localeCompare(teamB);
    });
    for (const [index, row] of byConference[conference].entries()) {
      row.conference_rank = index + 1;
    }
  }
}

async function updateStandings() {
  console.log('[Standings] Atualizando classificacoes...');
  try {
    await getDb();

    const teamsMeta = new Map();
    const metaRows = await queryAll('SELECT id, name, conference FROM teams');
    for (const meta of metaRows) teamsMeta.set(meta.id, meta);

    // Monta todos os novos dados ANTES de tocar na tabela.
    const nbaRows = await computeLeagueStandings('NBA');
    const nflRows = await computeLeagueStandings('NFL');
    computeConferenceRanks(nbaRows, teamsMeta);
    computeConferenceRanks(nflRows, teamsMeta);

    // Aplica a substituicao de forma atomica: a tabela nunca fica visivel
    // parcialmente vazia para consultas HTTP concorrentes.
    await transaction(async (tx) => {
      await tx.run("DELETE FROM standings WHERE league IN ('NBA', 'NFL')");
      const insertSql = `INSERT INTO standings (league, team_id, team, wins, losses, draws, points_for, points_against, win_pct, games_played, conference_rank, division_rank)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`;
      for (const row of [...nbaRows, ...nflRows]) {
        await tx.run(insertSql, [
          row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row.conference_rank || 0
        ]);
      }
    });

    await logSync('STANDINGS', 'success', 'NBA e NFL atualizadas');
    console.log('[Standings] OK');
  } catch (error) {
    console.error('[Standings] Erro:', error.message);
    await logSync('STANDINGS', 'error', error.message);
  }
  saveDb();
}

module.exports = { updateStandings };
