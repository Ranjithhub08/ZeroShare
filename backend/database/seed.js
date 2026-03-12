const { Pool } = require('pg');
require('dotenv').config();

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
    await client.query('TRUNCATE TABLE audit_logs, consents, user_data, users RESTART IDENTITY CASCADE');

    // Insert dummy user
    const userRes = await client.query(`
      INSERT INTO users (name, email, password_hash)
      VALUES ('Test User', 'test@zeroshare.com', 'dummy_hash')
      RETURNING id
    `);
    const userId = userRes.rows[0].id;

    // Insert structured consent requests matching UX
    const consents = [
      { app_name: 'HealthApp Plus', data_type: 'Medical Record (2023)', purpose: 'Health tracking & personalized insights', duration: '1 Year', risk_level: 'high', status: 'PENDING' },
      { app_name: 'FitnessTracker', data_type: 'Location History', purpose: 'Route mapping and distance calculation', duration: 'Permanent', risk_level: 'medium', status: 'GRANTED' },
      { app_name: 'LoanCalculator', data_type: 'Financial Statement Q3', purpose: 'Credit score assessment', duration: '30 Days', risk_level: 'high', status: 'DENIED' },
      { app_name: 'MarketingTool', data_type: 'Personal Address', purpose: 'Direct mail advertising', duration: '1 Year', risk_level: 'low', status: 'REVOKED' },
      { app_name: 'SmartHome Hub', data_type: 'Daily Routine Schedule', purpose: 'Automate home appliance operations', duration: 'Permanent', risk_level: 'medium', status: 'PENDING' }
    ];

    for (const c of consents) {
      await client.query(`
        INSERT INTO consents (user_id, app_name, data_type, purpose, duration, risk_level, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, c.app_name, c.data_type, c.purpose, c.duration, c.risk_level, c.status]);
    }

    // Insert Audit Logs
    const logs = [
      { event_type: 'Consent Granted', app_name: 'HealthApp Plus', data_accessed: 'Medical Record (2023)', status: 'Success' },
      { event_type: 'Data Accessed', app_name: 'FitnessTracker', data_accessed: 'Location History', status: 'Success' },
      { event_type: 'Consent Denied', app_name: 'LoanCalculator', data_accessed: 'Financial Statement Q3', status: 'Blocked' },
      { event_type: 'Data Added', app_name: 'User', data_accessed: 'Personal Address', status: 'Success' },
      { event_type: 'Consent Revoked', app_name: 'MarketingTool', data_accessed: 'Personal Address', status: 'Success' },
      { event_type: 'Login', app_name: 'System', data_accessed: 'Session', status: 'Success' }
    ];

    for (const l of logs) {
      await client.query(`
        INSERT INTO audit_logs (event_type, app_name, data_accessed, status)
        VALUES ($1, $2, $3, $4)
      `, [l.event_type, l.app_name, l.data_accessed, l.status]);
    }

    await client.query('COMMIT');
    console.log('Database seeded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', err);
  } finally {
    client.release();
    pool.end();
  }
};

seedDatabase();
