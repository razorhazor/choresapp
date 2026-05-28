import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import './db.js'; // initialises schema + seed on import
import authRoutes from './routes/auth.js';
import childrenRoutes from './routes/children.js';
import choresRoutes from './routes/chores.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
// Dev client origin. For production, set CLIENT_ORIGIN to your deployed URL.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
// When the built client is present (e.g. in the Docker image) we serve it from
// the same origin as the API. Defaults to ./public next to this file.
const CLIENT_DIST = process.env.CLIENT_DIST || path.join(__dirname, 'public');

const app = express();
app.disable('x-powered-by'); // don't advertise the framework

// Security headers (hand-rolled to avoid adding a dependency).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  // HSTS only matters (and is only honoured) over HTTPS.
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '32kb' })); // cap request body size
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api', choresRoutes); // exposes /api/chores* and /api/assignments*

// Serve the built client (when present) and fall back to index.html for SPA
// routes. Non-existent /api paths still fall through to the JSON 404 below.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    }
    next();
  });
  console.log(`[server] serving client from ${CLIENT_DIST}`);
}

// 404 for anything unmatched
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode;
  // Client errors (body too large -> 413, malformed JSON -> 400) shouldn't be 500s.
  if (status && status >= 400 && status < 500) {
    return res.status(status).json({ error: status === 413 ? 'Request too large' : 'Bad request' });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
