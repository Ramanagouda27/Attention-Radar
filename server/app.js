const express         = require('express');
const cors            = require('cors');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json());

app.use('/api', analyticsRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', project: 'Attention Radar API', version: '1.0.0' });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

module.exports = app;