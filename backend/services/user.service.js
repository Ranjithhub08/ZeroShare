const db = require('../database/db');

exports.getProfile = async () => {
  const query = 'SELECT * FROM users WHERE id = $1';
  const result = await db.query(query, ['user_1']);
  return result.rows[0];
};

exports.updateProfile = async (data) => {
  const query = 'UPDATE users SET full_name = $1, email = $2, avatar_url = $3 WHERE id = $4';
  const result = await db.query(query, [{
    full_name: data.full_name,
    email: data.email,
    avatar_url: data.avatar_url
  }, 'user_1']);
  return result.rows[0];
};

exports.updateNotifications = async (prefs) => {
  const query = 'UPDATE users SET notification_preferences = $1 WHERE id = $2';
  const result = await db.query(query, [prefs, 'user_1']);
  return result.rows[0];
};

exports.updatePassword = async (newPassword) => {
  // Mock password update
  return { success: true };
};
