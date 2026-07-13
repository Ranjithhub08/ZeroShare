const db = require('../database/db');

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

    const rows = await db.query(
      `SELECT ud.*, u.name as user_name FROM user_data ud
       LEFT JOIN users u ON ud.user_id = u.id
       ${where} ORDER BY ud.created_at DESC LIMIT $1 OFFSET $2`,
      params
    );
    return { data: rows.rows, total, page: parseInt(page), totalPages: Math.ceil(total/limit) };
  }

  async addData(userId, data_type, value) {
    const res = await db.query(
      `INSERT INTO user_data (user_id, data_type, value) VALUES ($1,$2,$3) RETURNING *`,
      [userId, data_type, value]
    );
    return res.rows[0];
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
