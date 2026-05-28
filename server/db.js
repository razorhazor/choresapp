import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// DB_PATH lets the SQLite file live on a mounted volume (e.g. in Docker).
const dbPath = process.env.DB_PATH || join(__dirname, 'chores.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      role          TEXT NOT NULL CHECK (role IN ('parent', 'child')),
      name          TEXT NOT NULL,
      email         TEXT UNIQUE,
      username      TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chores (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      due_date      TEXT,
      reward_type   TEXT NOT NULL DEFAULT 'financial'
                      CHECK (reward_type IN ('financial', 'custom')),
      reward_amount REAL NOT NULL DEFAULT 0,
      reward_text   TEXT,
      created_by    INTEGER NOT NULL REFERENCES users(id),
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chore_assignments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      chore_id     INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
      child_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'submitted', 'approved')),
      submitted_at TEXT,
      approved_at  TEXT,
      UNIQUE (chore_id, child_id)
    );

    CREATE INDEX IF NOT EXISTS idx_assignments_child ON chore_assignments(child_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_chore ON chore_assignments(chore_id);
  `);
}

// Additive migrations for databases created before a column existed.
// These never drop or rewrite existing data — they only add columns,
// defaulting existing chores to the 'financial' reward type.
function migrate() {
  const choreCols = db.prepare(`PRAGMA table_info(chores)`).all().map((c) => c.name);
  if (!choreCols.includes('reward_type')) {
    db.exec(`ALTER TABLE chores ADD COLUMN reward_type TEXT NOT NULL DEFAULT 'financial'`);
  }
  if (!choreCols.includes('reward_text')) {
    db.exec(`ALTER TABLE chores ADD COLUMN reward_text TEXT`);
  }
}

// Seed a single parent account on first run so the app is usable immediately.
// CHANGE THESE CREDENTIALS after first login (or delete chores.db to reset).
function seed() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (count > 0) return;

  const email = 'parent@home.com';
  const password = 'password123';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (role, name, email, password_hash) VALUES ('parent', 'Parent', ?, ?)`
  ).run(email, hash);

  console.warn(
    `\n[seed] Created default parent account: ${email} / ${password}\n` +
      `[seed] CHANGE THIS PASSWORD. Delete chores.db to reset the database.\n`
  );
}

initSchema();
migrate();
seed();

export default db;
