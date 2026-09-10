const serverless = require('serverless-http');
const app = require('../../backend/app');

const server = serverless(app);

// Netlify entrega o path relativo a function (/health) ou com o prefixo
// /.netlify/functions/api. O Express espera /api/<rota>. Normalizamos aqui.
const FUNCTION_BASE = '/.netlify/functions/api';

exports.handler = (event, context) => {
  let path = event.path || '/';
  if (path.startsWith(FUNCTION_BASE)) {
    path = path.slice(FUNCTION_BASE.length) || '/';
  }
  if (!path.startsWith('/api')) {
    path = path === '/' ? '/api' : '/api' + path;
  }
  const normalized = Object.assign({}, event, { path });
  return server(normalized, context);
};
