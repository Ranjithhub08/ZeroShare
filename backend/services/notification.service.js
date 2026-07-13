const db = require('../database/db');
const wsManager = require('./ws.manager');

class NotificationService {
  async getAll(userId, role) {
    const isAdmin = role === 'admin';
    const where = isAdmin ? '' : 'WHERE user_id = $1';
    const params = isAdmin ? [] : [userId];
    const res = await db.query(
      `SELECT * FROM notifications ${where} ORDER BY timestamp DESC LIMIT 30`,
      params
    );
    return res.rows;
  }

  async markRead(id) {
    const res = await db.query(
      `UPDATE notifications SET status='read' WHERE id=$1 RETURNING *`, [id]
    );
    return res.rows[0];
  }

  async markAllRead(userId, role) {
    const isAdmin = role === 'admin';
    const where = isAdmin ? '' : 'WHERE user_id = $1';
    const params = isAdmin ? [] : [userId];
    await db.query(`UPDATE notifications SET status='read' ${where}`, params);
  }

  async create(userId, event_type, message) {
    const res = await db.query(
      `INSERT INTO notifications (user_id, event_type, message, status)
       VALUES ($1, $2, $3, 'unread') RETURNING *`,
      [userId, event_type, message]
    );
    const notification = res.rows[0];
    // Push real-time to connected WebSocket client
    wsManager.send(userId, { type: 'notification', data: notification });
    return notification;
  }
}

module.exports = new NotificationService();
