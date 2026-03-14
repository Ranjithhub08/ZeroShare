const db = require('../database/db');

class NotificationService {
  async getAllNotifications() {
    const result = await db.query('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 10');
    return result.rows;
  }
}

module.exports = new NotificationService();
