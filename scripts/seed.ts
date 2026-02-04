import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
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

// Read and execute schema
const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

async function seed() {
  // Default admin credentials - CHANGE THESE IN PRODUCTION
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ardenus.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'Admin';

  // Check if admin already exists
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
  if (existing) {
    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // Create admin user
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).run(id, adminEmail, adminName, passwordHash, 'admin');

  console.log('');
  console.log('✓ Admin user created successfully!');
  console.log('');
  console.log('  Email:', adminEmail);
  console.log('  Password:', adminPassword);
  console.log('');
  console.log('⚠️  Change this password after first login!');
  console.log('');
}

seed().then(() => {
  db.close();
  process.exit(0);
}).catch((err) => {
  console.error('Seed failed:', err);
  db.close();
  process.exit(1);
});
