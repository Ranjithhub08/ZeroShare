const db = require('../database/db');

class AuditService {
  async getAllLogs() {
    const result = await db.query('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    return result.rows;
  }
}

module.exports = new AuditService();
