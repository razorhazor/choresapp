import { Router } from 'express';
import bcrypt from 'bcrypt';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { rewardTotal, monthlyTotals } from './auth.js';

const router = Router();

router.use(authMiddleware, requireRole('parent'));

// GET /api/children — list all child accounts with their running totals.
router.get('/', (req, res) => {
  const children = db
    .prepare(`SELECT id, name, username FROM users WHERE role = 'child' ORDER BY name`)
    .all();
  res.json({
    children: children.map((c) => ({
      ...c,
      rewardTotal: rewardTotal(c.id),
      monthly: monthlyTotals(c.id),
    })),
  });
});

// POST /api/children — create a child account.
router.post('/', (req, res) => {
  const { name, username, password } = req.body || {};
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Name, username and password are required' });
  }
  if (typeof name !== 'string' || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }
  if (name.length > 120 || username.length > 60) {
    return res.status(400).json({ error: 'Name or username is too long' });
  }
  if (password.length < 4 || password.length > 200) {
    return res.status(400).json({ error: 'Password must be 4-200 characters' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Username already taken' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (role, name, username, password_hash) VALUES ('child', ?, ?, ?)`
    )
    .run(name, username, hash);

  res.status(201).json({
    child: { id: info.lastInsertRowid, name, username, rewardTotal: 0, monthly: [] },
  });
});

export default router;
