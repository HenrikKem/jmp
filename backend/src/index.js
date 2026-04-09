require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const errorHandler = require('./middleware/errorHandler');

const authRoutes          = require('./routes/auth');
const usersRoutes         = require('./routes/users');
const orgUnitsRoutes      = require('./routes/orgUnits');
const eventsRoutes        = require('./routes/events');
const registrationsRoutes = require('./routes/registrations');
const adminRoutes         = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security & parsing ────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. server-to-server, curl)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/org-units',     orgUnitsRoutes);
app.use('/api/events',        eventsRoutes);
app.use('/api/registrations', registrationsRoutes);
app.use('/api/admin',         adminRoutes);

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

// ── Central error handler ─────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`JMP API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
