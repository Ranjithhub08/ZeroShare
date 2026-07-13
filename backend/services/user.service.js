const db = require('../database/db');
const bcrypt = require('bcrypt');

exports.getProfile = async (userId) => {
  const res = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [userId]);
  return res.rows[0];
};

exports.getAllUsers = async () => {
  const res = await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
     (SELECT COUNT(*) FROM consents WHERE user_id=u.id) as consent_count,
     (SELECT COUNT(*) FROM user_data WHERE user_id=u.id) as data_count
     FROM users u ORDER BY u.created_at DESC`
  );
  return res.rows;
};

exports.updateProfile = async (userId, data) => {
  const { name, email } = data;
  const res = await db.query(
    'UPDATE users SET name=$1, email=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING id,name,email,role',
    [name, email, userId]
  );
  return res.rows[0];
};

exports.updatePassword = async (userId, password) => {
  const hash = await bcrypt.hash(password, 10);
  await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, userId]);
};

exports.updateUserRole = async (targetId, role) => {
  const valid = ['admin','user'];
  if (!valid.includes(role)) throw new Error('Invalid role');
  const res = await db.query('UPDATE users SET role=$1 WHERE id=$2 RETURNING id,name,email,role', [role, targetId]);
  return res.rows[0];
};
