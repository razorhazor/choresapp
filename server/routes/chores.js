import { Router } from 'express';
import db from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = Router();
router.use(authMiddleware);

const parentOnly = requireRole('parent');
const childOnly = requireRole('child');

function validChildIds(ids) {
  if (!Array.isArray(ids)) return [];
  const unique = [...new Set(ids.map(Number).filter(Number.isInteger))];
  if (unique.length === 0) return [];
  const placeholders = unique.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT id FROM users WHERE role = 'child' AND id IN (${placeholders})`)
    .all(...unique);
  return rows.map((r) => r.id);
}

function parseChoreBody(body) {
  const name = (body?.name || '').trim();
  const description = (body?.description || '').trim();
  const due_date = body?.due_date ? String(body.due_date) : null;
  const reward_type = body?.reward_type === 'custom' ? 'custom' : 'financial';
  if (!name) return { error: 'Chore name is required' };

  if (reward_type === 'custom') {
    const reward_text = (body?.reward_text || '').trim();
    if (!reward_text) return { error: 'Enter the custom reward' };
    return { name, description, due_date, reward_type, reward_amount: 0, reward_text };
  }

  const reward_amount = Number(body?.reward_amount);
  if (!Number.isFinite(reward_amount) || reward_amount < 0) {
    return { error: 'Reward must be a non-negative number' };
  }
  return { name, description, due_date, reward_type, reward_amount, reward_text: null };
}

// ---- Parent: list every chore with its per-child assignment status ----
router.get('/chores', parentOnly, (req, res) => {
  const chores = db
    .prepare(
      `SELECT * FROM chores ORDER BY (due_date IS NULL), due_date ASC, created_at DESC`
    )
    .all();

  const assignments = db
    .prepare(
      `SELECT a.id AS assignmentId, a.chore_id, a.child_id, a.status,
              a.submitted_at, a.approved_at, u.name AS childName
         FROM chore_assignments a
         JOIN users u ON u.id = a.child_id
        ORDER BY u.name`
    )
    .all();

  const byChore = new Map();
  for (const a of assignments) {
    if (!byChore.has(a.chore_id)) byChore.set(a.chore_id, []);
    byChore.get(a.chore_id).push({
      assignmentId: a.assignmentId,
      childId: a.child_id,
      childName: a.childName,
      status: a.status,
      submittedAt: a.submitted_at,
      approvedAt: a.approved_at,
    });
  }

  res.json({
    chores: chores.map((c) => ({ ...c, assignments: byChore.get(c.id) || [] })),
  });
});

// ---- Parent: create a chore and assign it to children ----
router.post('/chores', parentOnly, (req, res) => {
  const parsed = parseChoreBody(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const childIds = validChildIds(req.body?.child_ids);
  if (childIds.length === 0) {
    return res.status(400).json({ error: 'Assign the chore to at least one child' });
  }

  const create = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO chores (name, description, due_date, reward_type, reward_amount, reward_text, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        parsed.name,
        parsed.description,
        parsed.due_date,
        parsed.reward_type,
        parsed.reward_amount,
        parsed.reward_text,
        req.user.id
      );
    const choreId = info.lastInsertRowid;
    const insertAssign = db.prepare(
      `INSERT INTO chore_assignments (chore_id, child_id) VALUES (?, ?)`
    );
    for (const cid of childIds) insertAssign.run(choreId, cid);
    return choreId;
  });

  res.status(201).json({ id: create() });
});

// ---- Parent: edit a chore; reassignment preserves existing progress ----
router.put('/chores/:id', parentOnly, (req, res) => {
  const id = Number(req.params.id);
  const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(id);
  if (!chore) return res.status(404).json({ error: 'Chore not found' });

  const parsed = parseChoreBody(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const childIds = validChildIds(req.body?.child_ids);
  if (childIds.length === 0) {
    return res.status(400).json({ error: 'Assign the chore to at least one child' });
  }

  const update = db.transaction(() => {
    db.prepare(
      `UPDATE chores SET name = ?, description = ?, due_date = ?,
              reward_type = ?, reward_amount = ?, reward_text = ? WHERE id = ?`
    ).run(
      parsed.name,
      parsed.description,
      parsed.due_date,
      parsed.reward_type,
      parsed.reward_amount,
      parsed.reward_text,
      id
    );

    const current = db
      .prepare('SELECT child_id FROM chore_assignments WHERE chore_id = ?')
      .all(id)
      .map((r) => r.child_id);

    const toAdd = childIds.filter((c) => !current.includes(c));
    const toRemove = current.filter((c) => !childIds.includes(c));

    const insertAssign = db.prepare(
      `INSERT INTO chore_assignments (chore_id, child_id) VALUES (?, ?)`
    );
    for (const cid of toAdd) insertAssign.run(id, cid);

    const delAssign = db.prepare(
      'DELETE FROM chore_assignments WHERE chore_id = ? AND child_id = ?'
    );
    for (const cid of toRemove) delAssign.run(id, cid);
  });

  update();
  res.json({ ok: true });
});

// ---- Parent: delete a chore (assignments cascade) ----
router.delete('/chores/:id', parentOnly, (req, res) => {
  const info = db.prepare('DELETE FROM chores WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'Chore not found' });
  res.json({ ok: true });
});

// ---- Child: list own chores, sorted by due date ----
router.get('/chores/mine', childOnly, (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.id AS assignmentId, a.status, a.submitted_at AS submittedAt,
              a.approved_at AS approvedAt,
              c.id AS choreId, c.name, c.description, c.due_date AS dueDate,
              c.reward_type AS rewardType, c.reward_amount AS rewardAmount,
              c.reward_text AS rewardText
         FROM chore_assignments a
         JOIN chores c ON c.id = a.chore_id
        WHERE a.child_id = ?
        ORDER BY (c.due_date IS NULL), c.due_date ASC, c.created_at DESC`
    )
    .all(req.user.id);
  res.json({ chores: rows });
});

// ---- Child: mark own assignment complete (awaiting approval) ----
router.post('/chores/:id/submit', childOnly, (req, res) => {
  const choreId = Number(req.params.id);
  const a = db
    .prepare('SELECT * FROM chore_assignments WHERE chore_id = ? AND child_id = ?')
    .get(choreId, req.user.id);
  if (!a) return res.status(404).json({ error: 'Chore not assigned to you' });
  if (a.status === 'approved') {
    return res.status(400).json({ error: 'Chore already approved' });
  }
  db.prepare(
    `UPDATE chore_assignments SET status = 'submitted', submitted_at = datetime('now') WHERE id = ?`
  ).run(a.id);
  res.json({ ok: true });
});

// ---- Parent: approve a submission (releases the reward) ----
router.post('/assignments/:id/approve', parentOnly, (req, res) => {
  const a = db.prepare('SELECT * FROM chore_assignments WHERE id = ?').get(Number(req.params.id));
  if (!a) return res.status(404).json({ error: 'Assignment not found' });
  if (a.status !== 'submitted') {
    return res.status(400).json({ error: 'Only submitted chores can be approved' });
  }
  db.prepare(
    `UPDATE chore_assignments SET status = 'approved', approved_at = datetime('now') WHERE id = ?`
  ).run(a.id);
  res.json({ ok: true });
});

// ---- Parent: reject a submission (sends it back to pending) ----
router.post('/assignments/:id/reject', parentOnly, (req, res) => {
  const a = db.prepare('SELECT * FROM chore_assignments WHERE id = ?').get(Number(req.params.id));
  if (!a) return res.status(404).json({ error: 'Assignment not found' });
  if (a.status !== 'submitted') {
    return res.status(400).json({ error: 'Only submitted chores can be rejected' });
  }
  db.prepare(
    `UPDATE chore_assignments SET status = 'pending', submitted_at = NULL WHERE id = ?`
  ).run(a.id);
  res.json({ ok: true });
});

export default router;
