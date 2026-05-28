import { Router } from 'express';
import bcrypt from 'bcrypt';
import db from '../db.js';
import { signToken, cookieOptions, authMiddleware, COOKIE_NAME } from '../auth.js';

const router = Router();

// Running total of approved *financial* rewards for a child (custom rewards
// are free text and are tallied separately, not summed into the money total).
function rewardTotal(childId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(c.reward_amount), 0) AS total
         FROM chore_assignments a
         JOIN chores c ON c.id = a.chore_id
        WHERE a.child_id = ? AND a.status = 'approved' AND c.reward_type = 'financial'`
    )
    .get(childId);
  return row.total;
}

// Approved rewards grouped by the calendar month they were approved in.
// approved_at is stored in UTC; 'localtime' buckets it into the local calendar month.
// total = sum of financial rewards; customCount = number of custom rewards.
function monthlyTotals(childId) {
  return db
    .prepare(
      `SELECT strftime('%Y-%m', a.approved_at, 'localtime') AS month,
              COALESCE(SUM(CASE WHEN c.reward_type = 'financial' THEN c.reward_amount ELSE 0 END), 0) AS total,
              SUM(CASE WHEN c.reward_type = 'custom' THEN 1 ELSE 0 END) AS customCount
         FROM chore_assignments a
         JOIN chores c ON c.id = a.chore_id
        WHERE a.child_id = ? AND a.status = 'approved' AND a.approved_at IS NOT NULL
        GROUP BY month
        ORDER BY month DESC`
    )
    .all(childId);
}

// Approved financial total for the current calendar month (local time).
function currentMonthTotal(childId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(c.reward_amount), 0) AS total
         FROM chore_assignments a
         JOIN chores c ON c.id = a.chore_id
        WHERE a.child_id = ? AND a.status = 'approved' AND c.reward_type = 'financial'
          AND strftime('%Y-%m', a.approved_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')`
    )
    .get(childId);
  return row.total;
}

// Number of approved custom rewards in the current calendar month (local time).
function currentMonthCustomCount(childId) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count
         FROM chore_assignments a
         JOIN chores c ON c.id = a.chore_id
        WHERE a.child_id = ? AND a.status = 'approved' AND c.reward_type = 'custom'
          AND strftime('%Y-%m', a.approved_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')`
    )
    .get(childId);
  return row.count;
}

function publicUser(user) {
  const base = { id: user.id, role: user.role, name: user.name };
  if (user.role === 'parent') base.email = user.email;
  if (user.role === 'child') {
    base.username = user.username;
    base.rewardTotal = rewardTotal(user.id);
    base.currentMonthTotal = currentMonthTotal(user.id);
    base.currentMonthCustomCount = currentMonthCustomCount(user.id);
    base.monthly = monthlyTotals(user.id);
  }
  return base;
}

// POST /api/auth/login — accepts a single "login" field matched against
// email (parents) or username (children).
router.post('/login', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) {
    return res.status(400).json({ error: 'Login and password are required' });
  }

  const user = db
    .prepare('SELECT * FROM users WHERE email = ? OR username = ?')
    .get(login, login);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: publicUser(user) });
});

export { rewardTotal, monthlyTotals, publicUser };
export default router;
