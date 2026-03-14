const db = require('../database/db');

class ActivityService {
  async getRecentActivity() {
    const result = await db.query(`
      SELECT 
        id, 
        event_type, 
        event_type as description, -- Using event_type as fallback for description
        app_name, 
        timestamp 
      FROM audit_logs 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    return result.rows;
  }
}

module.exports = new ActivityService();
