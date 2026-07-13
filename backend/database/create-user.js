const db = require('./db');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function createUser() {
  const email = 'pandagaming2445@gmail.com';
  const password = 'user123';
  const name = 'Yeswant';

  try {
    const existing = await db.query('SELECT id, email FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0) {
      console.log(`✅ User already exists: ${email}`);
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'user') RETURNING id, name, email, role`,
      [name, email, hash]
    );
    console.log(`✅ User created:`);
    console.log(`   Email   : ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role    : user`);
    console.log(`   ID      : ${result.rows[0].id}`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createUser();
