const db = require('../database/db');

class NotificationService {
  async getAll() {
    const res = await db.query('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 20');
    return res.rows;
  }
  async markRead(id) {
    const res = await db.query(`UPDATE notifications SET status='read' WHERE id=$1 RETURNING *`, [id]);
    return res.rows[0];
  }
}
module.exports = new NotificationService();
