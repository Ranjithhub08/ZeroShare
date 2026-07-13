const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : { user: 'postgres', host: 'localhost', database: 'zeroshare', password: 'password', port: 5432 }
);

async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log('Starting database seed...');
    await client.query('BEGIN');

    // Clear tables
    await client.query('TRUNCATE TABLE audit_logs, consents, user_data, notifications, users RESTART IDENTITY CASCADE');

    // Admin user
    const adminHash = await bcrypt.hash('Admin@1234', 10);
    const adminRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'admin') RETURNING id`,
      ['Admin User', 'admin@zeroshare.com', adminHash]
    );
    const adminId = adminRes.rows[0].id;

    // Regular users
    const userHash = await bcrypt.hash('User@1234', 10);
    const user1Res = await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'user') RETURNING id`,
      ['Ranjith Kumar', 'ranjith@zeroshare.com', userHash]
    );
    const user1Id = user1Res.rows[0].id;

    const user2Res = await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'user') RETURNING id`,
      ['Test User', 'test@zeroshare.com', userHash]
    );
    const user2Id = user2Res.rows[0].id;

    // user_data for user1
    const dataItems = [
      [user1Id, 'Medical Record', 'Blood test results - 2024'],
      [user1Id, 'Financial Statement', 'Q3 Bank Statement'],
      [user1Id, 'Personal Address', '123 Main St, City'],
      [user1Id, 'Identity Document', 'Passport copy'],
      [user2Id, 'Medical Record', 'Annual checkup 2024'],
      [user2Id, 'Location History', 'GPS data logs'],
    ];
    for (const [uid, dtype, val] of dataItems) {
      await client.query(`INSERT INTO user_data (user_id, data_type, value) VALUES ($1,$2,$3)`, [uid, dtype, val]);
    }

    // consents for user1
    const consents = [
      [user1Id, 'HealthApp Plus', 'Medical Record (2023)', 'Health tracking & personalized insights', '1 Year', 'high', 'PENDING'],
      [user1Id, 'FitnessTracker', 'Location History', 'Route mapping and distance calculation', 'Permanent', 'medium', 'GRANTED'],
      [user1Id, 'LoanCalculator', 'Financial Statement Q3', 'Credit score assessment', '30 Days', 'high', 'DENIED'],
      [user1Id, 'MarketingTool', 'Personal Address', 'Direct mail advertising', '1 Year', 'low', 'REVOKED'],
      [user2Id, 'SmartHome Hub', 'Daily Routine Schedule', 'Automate home appliance operations', 'Permanent', 'medium', 'PENDING'],
      [user2Id, 'HealthApp Plus', 'Medical Record', 'Personalized health tips', '6 Months', 'high', 'GRANTED'],
    ];
    for (const [uid, app, dtype, purpose, dur, risk, status] of consents) {
      await client.query(
        `INSERT INTO consents (user_id, app_name, data_type, purpose, duration, risk_level, status) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [uid, app, dtype, purpose, dur, risk, status]
      );
    }

    // audit_logs
    const logs = [
      [user1Id, 'Consent Granted', 'HealthApp Plus', 'Medical Record (2023)', 'Success'],
      [user1Id, 'Data Accessed', 'FitnessTracker', 'Location History', 'Success'],
      [user1Id, 'Consent Denied', 'LoanCalculator', 'Financial Statement Q3', 'Blocked'],
      [user2Id, 'Login', 'System', 'Session', 'Success'],
      [user2Id, 'Consent Granted', 'HealthApp Plus', 'Medical Record', 'Success'],
    ];
    for (const [uid, etype, app, data, status] of logs) {
      await client.query(
        `INSERT INTO audit_logs (user_id, event_type, app_name, data_accessed, status) VALUES ($1,$2,$3,$4,$5)`,
        [uid, etype, app, data, status]
      );
    }

    // notifications
    const notifs = [
      ['CONSENT_REQUEST', 'New consent request from HealthApp Plus', 'unread'],
      ['DATA_ACCESS', 'FitnessTracker accessed your Location History', 'read'],
      ['CONSENT_REVOKED', 'You revoked consent for MarketingTool', 'read'],
    ];
    for (const [etype, msg, status] of notifs) {
      await client.query(`INSERT INTO notifications (event_type, message, status) VALUES ($1,$2,$3)`, [etype, msg, status]);
    }

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully.');
    console.log('\nLogin credentials:');
    console.log('  Admin  → admin@zeroshare.com  / Admin@1234');
    console.log('  User 1 → ranjith@zeroshare.com / User@1234');
    console.log('  User 2 → test@zeroshare.com    / User@1234');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

seedDatabase();
