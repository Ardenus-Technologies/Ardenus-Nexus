import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'tracker.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

// Migrations: Add tag_id column to existing tables if missing
const migrations = [
  {
    name: 'add_tag_id_to_time_entries',
    check: () => {
      const columns = db.prepare("PRAGMA table_info(time_entries)").all() as { name: string }[];
      return columns.some(col => col.name === 'tag_id');
    },
    run: () => {
      db.exec('ALTER TABLE time_entries ADD COLUMN tag_id TEXT REFERENCES tags(id) ON DELETE SET NULL');
    }
  },
  {
    name: 'add_tag_id_to_active_timers',
    check: () => {
      const columns = db.prepare("PRAGMA table_info(active_timers)").all() as { name: string }[];
      return columns.some(col => col.name === 'tag_id');
    },
    run: () => {
      db.exec('ALTER TABLE active_timers ADD COLUMN tag_id TEXT REFERENCES tags(id) ON DELETE SET NULL');
    }
  }
];

// Run pending migrations
for (const migration of migrations) {
  if (!migration.check()) {
    try {
      migration.run();
      console.log(`Migration applied: ${migration.name}`);
    } catch (error) {
      console.error(`Migration failed: ${migration.name}`, error);
    }
  }
}

// Types
export interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DbTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DbTimeEntry {
  id: string;
  user_id: string;
  category_id: string;
  tag_id: string | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration: number;
  created_at: string;
}

export interface DbSession {
  id: string;
  session_token: string;
  user_id: string;
  expires: string;
}

export interface DbActiveTimer {
  id: string;
  user_id: string;
  category_id: string;
  tag_id: string | null;
  description: string | null;
  start_time: string;
  created_at: string;
}

export interface DbActiveTimerWithUser extends DbActiveTimer {
  user_name: string;
  user_email: string;
  category_name: string;
  category_color: string;
  tag_name: string | null;
  tag_color: string | null;
}

export interface DbTimeEntryWithUser extends DbTimeEntry {
  user_name: string;
  user_email: string;
  category_name: string;
  category_color: string;
  tag_name: string | null;
  tag_color: string | null;
}

// User queries
export const userQueries = {
  findByEmail: db.prepare<[string], DbUser>('SELECT * FROM users WHERE email = ?'),
  findById: db.prepare<[string], DbUser>('SELECT * FROM users WHERE id = ?'),
  findAll: db.prepare<[], DbUser>('SELECT id, email, name, role, created_at FROM users'),
  create: db.prepare<[string, string, string, string, string]>(
    'INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ),
  updatePassword: db.prepare<[string, string]>(
    'UPDATE users SET password_hash = ? WHERE id = ?'
  ),
  updateName: db.prepare<[string, string]>(
    'UPDATE users SET name = ? WHERE id = ?'
  ),
  delete: db.prepare<[string]>('DELETE FROM users WHERE id = ?'),
};

// Category queries
export const categoryQueries = {
  findAll: db.prepare<[], DbCategory>('SELECT * FROM categories ORDER BY created_at ASC'),
  findById: db.prepare<[string], DbCategory>('SELECT * FROM categories WHERE id = ?'),
  create: db.prepare<[string, string, string]>(
    'INSERT INTO categories (id, name, color) VALUES (?, ?, ?)'
  ),
  update: db.prepare<[string, string, string]>(
    'UPDATE categories SET name = ?, color = ? WHERE id = ?'
  ),
  delete: db.prepare<[string]>('DELETE FROM categories WHERE id = ?'),
};

// Tag queries
export const tagQueries = {
  findAll: db.prepare<[], DbTag>('SELECT * FROM tags ORDER BY created_at ASC'),
  findById: db.prepare<[string], DbTag>('SELECT * FROM tags WHERE id = ?'),
  create: db.prepare<[string, string, string]>(
    'INSERT INTO tags (id, name, color) VALUES (?, ?, ?)'
  ),
  update: db.prepare<[string, string, string]>(
    'UPDATE tags SET name = ?, color = ? WHERE id = ?'
  ),
  delete: db.prepare<[string]>('DELETE FROM tags WHERE id = ?'),
};

// Time entry queries
export const timeEntryQueries = {
  findByUserId: db.prepare<[string], DbTimeEntry>(
    'SELECT * FROM time_entries WHERE user_id = ? ORDER BY start_time DESC'
  ),
  findById: db.prepare<[string], DbTimeEntry>('SELECT * FROM time_entries WHERE id = ?'),
  create: db.prepare<[string, string, string, string | null, string | null, string, string | null, number]>(
    'INSERT INTO time_entries (id, user_id, category_id, tag_id, description, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ),
  update: db.prepare<[string, string | null, string | null, string, string | null, number, string]>(
    'UPDATE time_entries SET category_id = ?, tag_id = ?, description = ?, start_time = ?, end_time = ?, duration = ? WHERE id = ?'
  ),
  delete: db.prepare<[string]>('DELETE FROM time_entries WHERE id = ?'),
  deleteByUserId: db.prepare<[string]>('DELETE FROM time_entries WHERE user_id = ?'),
};

// Session queries
export const sessionQueries = {
  findByToken: db.prepare<[string], DbSession>(
    'SELECT * FROM sessions WHERE session_token = ?'
  ),
  create: db.prepare<[string, string, string, string]>(
    'INSERT INTO sessions (id, session_token, user_id, expires) VALUES (?, ?, ?, ?)'
  ),
  delete: db.prepare<[string]>('DELETE FROM sessions WHERE session_token = ?'),
  deleteExpired: db.prepare("DELETE FROM sessions WHERE expires < datetime('now')"),
  deleteByUserId: db.prepare<[string]>('DELETE FROM sessions WHERE user_id = ?'),
};

// Active timer queries
export const activeTimerQueries = {
  findByUserId: db.prepare<[string], DbActiveTimer>(
    'SELECT * FROM active_timers WHERE user_id = ?'
  ),
  findAllWithUsers: db.prepare<[], DbActiveTimerWithUser>(`
    SELECT
      at.*,
      u.name as user_name,
      u.email as user_email,
      c.name as category_name,
      c.color as category_color,
      t.name as tag_name,
      t.color as tag_color
    FROM active_timers at
    JOIN users u ON at.user_id = u.id
    JOIN categories c ON at.category_id = c.id
    LEFT JOIN tags t ON at.tag_id = t.id
    ORDER BY at.start_time ASC
  `),
  create: db.prepare<[string, string, string, string | null, string | null, string]>(
    'INSERT OR REPLACE INTO active_timers (id, user_id, category_id, tag_id, description, start_time) VALUES (?, ?, ?, ?, ?, ?)'
  ),
  update: db.prepare<[string, string | null, string | null, string]>(
    'UPDATE active_timers SET category_id = ?, tag_id = ?, description = ? WHERE user_id = ?'
  ),
  deleteByUserId: db.prepare<[string]>('DELETE FROM active_timers WHERE user_id = ?'),
};

// Team queries (all users' entries)
export const teamQueries = {
  findAllEntries: db.prepare<[], DbTimeEntryWithUser>(`
    SELECT
      te.*,
      u.name as user_name,
      u.email as user_email,
      c.name as category_name,
      c.color as category_color,
      t.name as tag_name,
      t.color as tag_color
    FROM time_entries te
    JOIN users u ON te.user_id = u.id
    JOIN categories c ON te.category_id = c.id
    LEFT JOIN tags t ON te.tag_id = t.id
    ORDER BY te.start_time DESC
    LIMIT 100
  `),
  findEntriesByDate: db.prepare<[string, string], DbTimeEntryWithUser>(`
    SELECT
      te.*,
      u.name as user_name,
      u.email as user_email,
      c.name as category_name,
      c.color as category_color,
      t.name as tag_name,
      t.color as tag_color
    FROM time_entries te
    JOIN users u ON te.user_id = u.id
    JOIN categories c ON te.category_id = c.id
    LEFT JOIN tags t ON te.tag_id = t.id
    WHERE te.start_time >= ? AND te.start_time < ?
    ORDER BY te.start_time DESC
  `),
};

// Helper functions
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getDb(): Database.Database {
  return db;
}

export default db;
