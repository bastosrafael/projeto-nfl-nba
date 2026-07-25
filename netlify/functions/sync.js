const { syncAll } = require('../../backend/sync/syncGames');
exports.handler = async () => {
  try { await syncAll(); return { statusCode: 200, body: JSON.stringify({ success: true }) }; }
  catch (error) { console.error(error); return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) }; }
};
exports.config = { schedule: '*/5 * * * *' };