const db = require('../database/db');

class AuditService {
  async getAllLogs(page = 1, limit = 10, sortBy = 'timestamp', sortDir = 'DESC') {
    const offset = (page - 1) * limit;
    
    // Get total count first
    const countResult = await db.query('SELECT COUNT(*) FROM audit_logs');
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const query = `
      SELECT * FROM audit_logs 
      ORDER BY ${sortBy} ${sortDir} 
      LIMIT ${limit} OFFSET ${offset}
    `;
    const result = await db.query(query);
    
    return {
      logs: result.rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }
}

module.exports = new AuditService();
