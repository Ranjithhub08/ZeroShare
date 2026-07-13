const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'zeroshare',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

const seedDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('Starting database seed...');
    await client.query('BEGIN');

    // Reset tables
    await client.query('TRUNCATE TABLE audit_logs, consents, user_data, users, notifications RESTART IDENTITY CASCADE');

    // Create admin account
    const adminHash = await bcrypt.hash('admin123', 10);
    const adminRes = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Ranjith', 'ranjithkumarhub@gmail.com', $1, 'admin')
      RETURNING id
    `, [adminHash]);
    const adminId = adminRes.rows[0].id;

    // Create regular user account
    const userHash = await bcrypt.hash('user123', 10);
    const userRes = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Test User', 'user@zeroshare.io', $1, 'user')
      RETURNING id
    `, [userHash]);
    const userId = userRes.rows[0].id;

    console.log(`✅ Admin created: ranjithkumarhub@gmail.com / admin123`);
    console.log(`✅ User created:  user@zeroshare.io  / user123`);

    // Seed consents for the user
    const consents = [
      { app_name: 'HealthApp Plus',   data_type: 'Medical Record', purpose: 'Health tracking & personalized insights', duration: '1 Year',   risk_level: 'high',   status: 'PENDING' },
      { app_name: 'FitnessTracker',   data_type: 'Location Data',  purpose: 'Route mapping and distance calculation', duration: 'Permanent', risk_level: 'medium', status: 'GRANTED' },
      { app_name: 'LoanCalculator',   data_type: 'Financial Record',purpose: 'Credit score assessment',               duration: '30 Days',   risk_level: 'high',   status: 'DENIED'  },
      { app_name: 'MarketingTool',    data_type: 'Email',           purpose: 'Direct mail advertising',               duration: '1 Year',    risk_level: 'low',    status: 'REVOKED' },
      { app_name: 'SmartHome Hub',    data_type: 'Address',         purpose: 'Automate home appliance operations',    duration: '6 Months',  risk_level: 'medium', status: 'PENDING' }
    ];

    for (const c of consents) {
      await client.query(`
        INSERT INTO consents (user_id, app_name, data_type, purpose, duration, risk_level, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [userId, c.app_name, c.data_type, c.purpose, c.duration, c.risk_level, c.status]);
    }

    // Seed user data
    const userData = [
      { data_type: 'Resume',          value: 'Software Engineer with 5 years experience in React and Node.js' },
      { data_type: 'Email',           value: 'user@zeroshare.io' },
      { data_type: 'Medical Record',  value: 'Blood type: O+, No known allergies' },
      { data_type: 'Financial Record',value: 'Annual income: $85,000' },
    ];

    for (const d of userData) {
      await client.query(`
        INSERT INTO user_data (user_id, data_type, value) VALUES ($1,$2,$3)
      `, [userId, d.data_type, d.value]);
    }

    // Seed audit logs
    const logs = [
      { event_type: 'Data Added',        app_name: 'System',          user_id: userId },
      { event_type: 'CONSENT_GRANTED',   app_name: 'FitnessTracker',  user_id: userId },
      { event_type: 'CONSENT_DENIED',    app_name: 'LoanCalculator',  user_id: userId },
      { event_type: 'CONSENT_REVOKED',   app_name: 'MarketingTool',   user_id: userId },
      { event_type: 'Data Accessed',     app_name: 'FitnessTracker',  user_id: userId },
    ];

    for (const l of logs) {
      await client.query(`
        INSERT INTO audit_logs (event_type, app_name, user_id, status)
        VALUES ($1,$2,$3,'Success')
      `, [l.event_type, l.app_name, l.user_id]);
    }

    // Seed a welcome notification
    await client.query(`
      INSERT INTO notifications (user_id, event_type, message, status)
      VALUES ($1, 'Welcome', 'Welcome to ZeroShare! Your data is protected.', 'unread')
    `, [userId]);

    await client.query('COMMIT');
    console.log('\n✅ Database seeded successfully!');
    console.log('─────────────────────────────────');
    console.log('  Admin → ranjithkumarhub@gmail.com / admin123');
    console.log('  User  → user@zeroshare.io        / user123');
    console.log('─────────────────────────────────');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', err.message);
  } finally {
    client.release();
    pool.end();
  }
};

seedDatabase();
