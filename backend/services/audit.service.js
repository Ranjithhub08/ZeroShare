const db = require('../database/db');

class AuditService {
  async getLogs(userId, role, page=1, limit=10) {
    const offset = (page-1)*limit;
    const isAdmin = role === 'admin';
    const where = isAdmin ? '' : 'WHERE al.user_id = $3';
    const params = isAdmin ? [limit, offset] : [limit, offset, userId];

    const countRes = await db.query(
      `SELECT COUNT(*) FROM audit_logs ${isAdmin ? '' : 'WHERE user_id = $1'}`,
      isAdmin ? [] : [userId]
    );
    const total = parseInt(countRes.rows[0].count);

    const rows = await db.query(
      `SELECT al.*, u.name as user_name FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${where} ORDER BY al.timestamp DESC LIMIT $1 OFFSET $2`,
      params
    );
    return { logs: rows.rows, total, page: parseInt(page), totalPages: Math.ceil(total/limit) };
  }
}
module.exports = new AuditService();
