import jwt from 'jsonwebtoken';

// Dev fallback secret. In production set JWT_SECRET in the environment.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const TOKEN_DAYS = 7;
export const COOKIE_NAME = 'token';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: `${TOKEN_DAYS}d`,
  });
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // set true behind HTTPS in production
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
