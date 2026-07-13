const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'zeroshare',
        password: process.env.DB_PASSWORD || 'password',
        port: process.env.DB_PORT || 5432,
      }
);

module.exports = {
  query: (text, params) => pool.query(text, params),
};
