require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/db');

const configRoute = require('./src/routes/config');
const estimateRoute = require('./src/routes/estimate');
const adminRoute = require('./src/routes/admin');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: false
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/config', configRoute);
app.use('/api/estimate', estimateRoute);
app.use('/api/admin', adminRoute);

// Centralized error fallback (any thrown error not already handled by a route).
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  });
