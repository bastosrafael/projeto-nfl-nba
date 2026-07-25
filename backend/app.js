require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { getDb } = require('./db/init');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api/games', require('./routes/games'));
app.use('/api/standings', require('./routes/standings'));
app.use('/api/admin', require('./routes/adminSync'));
app.get('/api/health', (req, res) => res.json({ status: 'online', timestamp: new Date().toISOString(), version: '1.0.0' }));
app.locals.init = () => getDb();
module.exports = app;