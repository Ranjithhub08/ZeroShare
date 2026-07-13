const db = require('./db');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function createAdmin() {
  const email = 'ranjithkumarhub@gmail.com';
  const password = 'admin123';
  const name = 'Ranjith';

  const existing = await db.query('SELECT id FROM users WHERE email=$1', [email]);
  if (existing.rows.length > 0) {
    console.log(`✅ Admin already exists: ${email}`);
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 10);
  await db.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'admin')`,
    [name, email, hash]
  );
  console.log(`✅ Admin created: ${email} / ${password}`);
  process.exit(0);
}

createAdmin().catch(err => { console.error(err.message); process.exit(1); });
