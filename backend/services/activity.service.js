const db = require('../database/db');

class ActivityService {
  async getRecentActivity(userId, role) {
    const where = role === 'admin' ? '' : 'WHERE user_id = $1';
    const params = role === 'admin' ? [] : [userId];
    const res = await db.query(
      `SELECT id, event_type, app_name, timestamp,
        CASE event_type
          WHEN 'CONSENT_GRANTED' THEN 'Consent granted'
          WHEN 'CONSENT_DENIED'  THEN 'Consent denied'
          WHEN 'CONSENT_REVOKED' THEN 'Consent revoked'
          WHEN 'Data Accessed'   THEN 'Data accessed'
          WHEN 'Data Added'      THEN 'Data record added'
          WHEN 'Data Deleted'    THEN 'Data record deleted'
          ELSE event_type
        END as description
       FROM audit_logs ${where} ORDER BY timestamp DESC LIMIT 10`,
      params
    );
    return res.rows;
  }
}
module.exports = new ActivityService();
