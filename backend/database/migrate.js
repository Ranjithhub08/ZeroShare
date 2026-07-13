const db = require('./db');

async function migrate() {
  console.log('Running migrations...');
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'`);
  await db.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  await db.query(`ALTER TABLE consents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE`);

  // 2FA columns
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp VARCHAR(6)`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires TIMESTAMP WITH TIME ZONE`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_temp_token VARCHAR(255)`);

  // Suspend users
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE`);

  // Sessions table
  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      is_revoked BOOLEAN DEFAULT FALSE
    )
  `);

  // Consent history table
  await db.query(`
    CREATE TABLE IF NOT EXISTS consent_history (
      id SERIAL PRIMARY KEY,
      consent_id INTEGER REFERENCES consents(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL,
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      note TEXT,
      changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Renewal reminder flag on consents
  await db.query(`ALTER TABLE consents ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE`);

  // Avatar URL on users
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)`);

  console.log('✅ Migrations done.');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
