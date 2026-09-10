const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/games', require('./routes/games'));
app.use('/api/standings', require('./routes/standings'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint não encontrado.' });
});

module.exports = app;
