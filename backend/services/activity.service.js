const db = require('../database/db');

class ActivityService {
  async getRecentActivity(userId, role) {
    const where = role === 'admin' ? '' : 'WHERE user_id = $1';
    const params = role === 'admin' ? [] : [userId];
    const res = await db.query(
      `SELECT id, event_type, app_name, timestamp FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT 10`,
      params
    );
    return res.rows;
  }
}
module.exports = new ActivityService();
