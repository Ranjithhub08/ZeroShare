const db = require('../database/db');

class AnalyticsService {
  async getDashboardStats() {
    const queries = {
      total_data: 'SELECT COUNT(*) FROM user_data',
      active_consents: "SELECT COUNT(*) FROM consents WHERE status = 'GRANTED'",
      revoked_consents: "SELECT COUNT(*) FROM consents WHERE status = 'REVOKED'",
      total_access_events: "SELECT COUNT(*) FROM audit_logs WHERE event_type = 'Data Accessed'"
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const res = await db.query(query);
      results[key] = parseInt(res.rows[0].count);
    }

    // Consent Activity Over Time (Requests per day for the last 30 days)
    const activityQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as count
      FROM consents
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `;
    const activityRes = await db.query(activityQuery);
    results.consent_activity_over_time = activityRes.rows.map(row => ({
      date: row.date,
      count: parseInt(row.count)
    }));

    // Data Type Distribution
    const distributionQuery = `
      SELECT 
        data_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / COALESCE(NULLIF((SELECT COUNT(*) FROM user_data), 0), 1), 2) as percentage
      FROM user_data
      GROUP BY data_type
    `;
    const distributionRes = await db.query(distributionQuery);
    results.data_type_distribution = distributionRes.rows.map(row => ({
      type: row.data_type.toLowerCase(),
      count: parseInt(row.count),
      percentage: parseFloat(row.percentage)
    }));

    return results;
  }
}

module.exports = new AnalyticsService();
