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
  },
  {
    name: 'create_rooms_table',
    check: () => {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms'").all();
      return tables.length > 0;
    },
    run: () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          meet_link TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO rooms (id, name, meet_link) VALUES
          ('room-1', 'Open Office', NULL),
          ('room-2', 'Focus Room', NULL);
      `);
    }
  },
  {
    name: 'add_require_clock_in_to_rooms',
    check: () => {
      const columns = db.prepare("PRAGMA table_info(rooms)").all() as { name: string }[];
      return columns.some(col => col.name === 'require_clock_in');
    },
    run: () => {
      db.exec('ALTER TABLE rooms ADD COLUMN require_clock_in INTEGER NOT NULL DEFAULT 1');
    }
  },
  {
    name: 'create_room_participants_table',
    check: () => {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='room_participants'").all();
      return tables.length > 0;
    },
    run: () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS room_participants (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(room_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
        CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);
      `);
    }
  },
  {
    name: 'create_task_assignees_table',
    check: () => {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='task_assignees'").all();
      return tables.length > 0;
    },
    run: () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS task_assignees (
          task_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (task_id, user_id),
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);
      `);
      // Migrate existing assignee_id data into the join table
      db.exec(`
        INSERT OR IGNORE INTO task_assignees (task_id, user_id)
        SELECT id, assignee_id FROM tasks WHERE assignee_id IS NOT NULL
      `);
    }
  },
  {
    name: 'add_position_to_tasks',
    check: () => {
      const columns = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
      return columns.some(col => col.name === 'position');
    },
    run: () => {
      db.exec('ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0');
      // Initialize positions based on current sort order
      const tasks = db.prepare(`
        SELECT id FROM tasks
        WHERE parent_task_id IS NULL
        ORDER BY
          CASE status WHEN 'todo' THEN 0 WHEN 'done' THEN 1 END,
          created_at DESC
      `).all() as { id: string }[];
      const updateStmt = db.prepare('UPDATE tasks SET position = ? WHERE id = ?');
      for (let i = 0; i < tasks.length; i++) {
        updateStmt.run(i, tasks[i].id);
      }
      db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position)');
    }
  },
  {
    name: 'add_type_to_task_assignees',
    check: () => {
      const columns = db.prepare("PRAGMA table_info(task_assignees)").all() as { name: string }[];
      return columns.some(col => col.name === 'type');
    },
    run: () => {
      db.exec("ALTER TABLE task_assignees ADD COLUMN type TEXT NOT NULL DEFAULT 'assigned'");
    }
  },
  {
    name: 'remove_in_progress_status',
    check: () => {
      // If no rows have in_progress, migration is done (or wasn't needed)
      const row = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress'").get() as { count: number };
      return row.count === 0;
    },
    run: () => {
      db.exec("UPDATE tasks SET status = 'todo' WHERE status = 'in_progress'");
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

// Create indexes that depend on migrations (safe to re-run)
const postMigrationIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position)',
  'CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id)',
  'CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id)',
];
for (const sql of postMigrationIndexes) {
  try { db.exec(sql); } catch { /* column/table may not exist in edge cases */ }
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

export interface DbRoom {
  id: string;
  name: string;
  meet_link: string | null;
  require_clock_in: number;
  created_at: string;
}

export interface DbRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
}

export interface DbRoomParticipantWithUser extends DbRoomParticipant {
  user_name: string;
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

export interface DbTask {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'done';
  assignee_id: string | null;
  created_by: string;
  due_date: string | null;
  time_estimate: number | null;
  parent_task_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface DbTaskWithUsers extends DbTask {
  creator_name: string;
}

export interface DbTaskAssignee {
  task_id: string;
  user_id: string;
  user_name: string;
  type: 'assigned' | 'opted_in';
  assigned_at: string;
}

export interface DbTaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface DbTaskCommentWithUser extends DbTaskComment {
  user_name: string;
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

// Room queries
export const roomQueries = {
  findAll: db.prepare<[], DbRoom>('SELECT * FROM rooms ORDER BY created_at ASC'),
  findById: db.prepare<[string], DbRoom>('SELECT * FROM rooms WHERE id = ?'),
  create: db.prepare<[string, string, string | null, number]>(
    'INSERT INTO rooms (id, name, meet_link, require_clock_in) VALUES (?, ?, ?, ?)'
  ),
  update: db.prepare<[string, string | null, number, string]>(
    'UPDATE rooms SET name = ?, meet_link = ?, require_clock_in = ? WHERE id = ?'
  ),
  delete: db.prepare<[string]>('DELETE FROM rooms WHERE id = ?'),
};

// Room participant queries
export const roomParticipantQueries = {
  findByRoomId: db.prepare<[string], DbRoomParticipant>(
    'SELECT * FROM room_participants WHERE room_id = ?'
  ),
  findAllWithUsers: db.prepare<[], DbRoomParticipantWithUser>(`
    SELECT
      rp.*,
      u.name as user_name
    FROM room_participants rp
    JOIN users u ON rp.user_id = u.id
    ORDER BY rp.joined_at ASC
  `),
  join: db.prepare<[string, string, string]>(
    'INSERT OR IGNORE INTO room_participants (id, room_id, user_id) VALUES (?, ?, ?)'
  ),
  leave: db.prepare<[string, string]>(
    'DELETE FROM room_participants WHERE room_id = ? AND user_id = ?'
  ),
  leaveAll: db.prepare<[string]>(
    'DELETE FROM room_participants WHERE user_id = ?'
  ),
  leaveRequireClockIn: db.prepare<[string]>(
    'DELETE FROM room_participants WHERE user_id = ? AND room_id IN (SELECT id FROM rooms WHERE require_clock_in = 1)'
  ),
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

// Task queries
export const taskQueries = {
  findAll: db.prepare<[], DbTaskWithUsers>(`
    SELECT
      t.*,
      c.name as creator_name
    FROM tasks t
    JOIN users c ON t.created_by = c.id
    WHERE t.parent_task_id IS NULL
    ORDER BY t.position ASC
  `),
  findById: db.prepare<[string], DbTaskWithUsers>(`
    SELECT
      t.*,
      c.name as creator_name
    FROM tasks t
    JOIN users c ON t.created_by = c.id
    WHERE t.id = ?
  `),
  findSubtasks: db.prepare<[string], DbTaskWithUsers>(`
    SELECT
      t.*,
      c.name as creator_name
    FROM tasks t
    JOIN users c ON t.created_by = c.id
    WHERE t.parent_task_id = ?
    ORDER BY t.created_at ASC
  `),
  create: db.prepare<[string, string, string | null, string, string | null, string, string | null, number | null, string | null, number]>(
    'INSERT INTO tasks (id, title, description, status, assignee_id, created_by, due_date, time_estimate, parent_task_id, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ),
  update: db.prepare<[string, string | null, string, string | null, number | null, string, string]>(
    'UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ?, time_estimate = ?, updated_at = ? WHERE id = ?'
  ),
  updateStatus: db.prepare<[string, string, string]>(
    'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?'
  ),
  updatePosition: db.prepare<[number, string]>(
    'UPDATE tasks SET position = ? WHERE id = ?'
  ),
  shiftPositions: db.prepare(
    'UPDATE tasks SET position = position + 1 WHERE parent_task_id IS NULL'
  ),
  maxPosition: db.prepare<[], { max_pos: number | null }>(
    'SELECT MAX(position) as max_pos FROM tasks WHERE parent_task_id IS NULL'
  ),
  delete: db.prepare<[string]>('DELETE FROM tasks WHERE id = ?'),
};

// Task assignee queries
export const taskAssigneeQueries = {
  findByTaskId: db.prepare<[string], DbTaskAssignee>(`
    SELECT
      ta.task_id,
      ta.user_id,
      u.name as user_name,
      ta.type,
      ta.assigned_at
    FROM task_assignees ta
    JOIN users u ON ta.user_id = u.id
    WHERE ta.task_id = ?
    ORDER BY ta.assigned_at ASC
  `),
  add: db.prepare<[string, string, string]>(
    'INSERT OR IGNORE INTO task_assignees (task_id, user_id, type) VALUES (?, ?, ?)'
  ),
  remove: db.prepare<[string, string]>(
    'DELETE FROM task_assignees WHERE task_id = ? AND user_id = ?'
  ),
  isInTask: db.prepare<[string, string], { count: number }>(
    'SELECT COUNT(*) as count FROM task_assignees WHERE task_id = ? AND user_id = ?'
  ),
};

// Task comment queries
export const taskCommentQueries = {
  findByTaskId: db.prepare<[string], DbTaskCommentWithUser>(`
    SELECT
      tc.*,
      u.name as user_name
    FROM task_comments tc
    JOIN users u ON tc.user_id = u.id
    WHERE tc.task_id = ?
    ORDER BY tc.created_at ASC
  `),
  countByTaskId: db.prepare<[string], { count: number }>(
    'SELECT COUNT(*) as count FROM task_comments WHERE task_id = ?'
  ),
  create: db.prepare<[string, string, string, string]>(
    'INSERT INTO task_comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)'
  ),
  findById: db.prepare<[string], DbTaskComment>(
    'SELECT * FROM task_comments WHERE id = ?'
  ),
  delete: db.prepare<[string]>('DELETE FROM task_comments WHERE id = ?'),
};

// Helper functions
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getDb(): Database.Database {
  return db;
}

export default db;
