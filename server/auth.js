import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_DAYS = 7;
export const COOKIE_NAME = 'token';

// Known-weak values that must never be used to sign tokens — using any of
// these would let anyone forge a session. (The old compose default lived here.)
const WEAK_SECRETS = new Set([
  '',
  'redacted-placeholder',
  'dev-insecure-secret-change-me',
  'changeme',
  'change-me',
  'secret',
  'please-change-me',
]);

// Resolve the JWT signing secret, in order of preference:
//  1. A strong JWT_SECRET from the environment (best; needed for multi-instance).
//  2. A strong random secret persisted next to the database (survives restarts).
//  3. An ephemeral random secret (last resort, e.g. read-only filesystem).
// A weak/short JWT_SECRET is rejected rather than trusted.
function resolveSecret() {
  const env = process.env.JWT_SECRET;
  if (env && env.length >= 16 && !WEAK_SECRETS.has(env)) return env;
  if (env) {
    console.warn(
      '[auth] JWT_SECRET is weak or too short and is being IGNORED. ' +
        'Set a strong JWT_SECRET (>= 16 random chars). Falling back to a generated secret.'
    );
  } else {
    console.warn(
      '[auth] JWT_SECRET not set — generating a persistent random secret. ' +
        'Set JWT_SECRET for multi-instance deployments.'
    );
  }

  const dataDir = path.dirname(process.env.DB_PATH || path.join(__dirname, 'chores.db'));
  const secretFile = path.join(dataDir, '.jwt_secret');
  try {
    if (fs.existsSync(secretFile)) {
      const existing = fs.readFileSync(secretFile, 'utf8').trim();
      if (existing.length >= 16) return existing;
    }
    fs.mkdirSync(dataDir, { recursive: true });
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretFile, generated, { mode: 0o600 });
    return generated;
  } catch (err) {
    console.warn(
      `[auth] Could not persist a secret (${err.message}); using an ephemeral one ` +
        '(existing sessions reset on restart).'
    );
    return crypto.randomBytes(48).toString('hex');
  }
}

const JWT_SECRET = resolveSecret();

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: `${TOKEN_DAYS}d`,
  });
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    // Set COOKIE_SECURE=true when serving over HTTPS so the cookie is only
    // sent over secure connections.
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: TOKEN_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

// Verifies the JWT from the httpOnly cookie and attaches req.user.
export function authMiddleware(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
