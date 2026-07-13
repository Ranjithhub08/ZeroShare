const db = require('./db');

async function migrate() {
  console.log('Running migrations...');
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'`);
  await db.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await db.query(`ALTER TABLE consents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE`);
  console.log('✅ Migrations done.');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
