const db = require('../database/db');
const { encrypt, decrypt } = require('./encryption.service');

class DataService {
  async listData(userId, role, page=1, limit=10) {
    const offset = (page-1)*limit;
    const isAdmin = role === 'admin';
    const where = isAdmin ? '' : 'WHERE user_id = $3';
    const params = isAdmin ? [limit, offset] : [limit, offset, userId];

    const countRes = await db.query(
      `SELECT COUNT(*) FROM user_data ${isAdmin ? '' : 'WHERE user_id = $1'}`,
      isAdmin ? [] : [userId]
    );
    const total = parseInt(countRes.rows[0].count);

    // Admin sees [ENCRYPTED] — enforced at SQL level
    const selectValue = isAdmin ? `'[ENCRYPTED]' as value` : `ud.value`;
    const rows = await db.query(
      `SELECT ud.id, ud.user_id, ud.data_type, ud.created_at, ud.updated_at,
       ud.record_type, ud.file_name, ud.file_size, ud.file_url,
       u.name as user_name, ${selectValue}
       FROM user_data ud
       LEFT JOIN users u ON ud.user_id = u.id
       ${where} ORDER BY ud.created_at DESC LIMIT $1 OFFSET $2`,
      params
    );

    // Decrypt values for regular users
    const data = rows.rows.map(r => ({
      ...r,
      value: isAdmin ? '[ENCRYPTED]' : decrypt(r.value)
    }));

    return { data, total, page: parseInt(page), totalPages: Math.ceil(total/limit) };
  }

  async addData(userId, data_type, value) {
    const encryptedValue = encrypt(value);
    const res = await db.query(
      `INSERT INTO user_data (user_id, data_type, value) VALUES ($1,$2,$3) RETURNING *`,
      [userId, data_type, encryptedValue]
    );
    const row = res.rows[0];
    return { ...row, value: decrypt(row.value) };
  }

  async exportData(userId) {
    const res = await db.query(
      `SELECT id, data_type, value, created_at FROM user_data WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId]
    );
    // Decrypt all values for the owner
    return res.rows.map(r => ({ ...r, value: decrypt(r.value) }));
  }

  async deleteData(id, userId, role) {
    const where = role === 'admin' ? 'WHERE id = $1' : 'WHERE id = $1 AND user_id = $2';
    const params = role === 'admin' ? [id] : [id, userId];
    const res = await db.query(`DELETE FROM user_data ${where} RETURNING id`, params);
    if (res.rows.length === 0) throw new Error('Data not found or access denied');
    return res.rows[0];
  }
}
module.exports = new DataService();
