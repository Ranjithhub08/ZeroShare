const db = require('../database/db');

class AnalyticsService {
  async getDashboardStats(userId, role) {
    const isAdmin = role === 'admin';
    const uf = isAdmin ? '' : `AND user_id = ${userId}`;
    const uw = isAdmin ? '' : `WHERE user_id = ${userId}`;

    const [totalData, activeConsents, revokedConsents, accessEvents] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM user_data ${uw}`),
      db.query(`SELECT COUNT(*) FROM consents WHERE status='GRANTED' ${uf}`),
      db.query(`SELECT COUNT(*) FROM consents WHERE status='REVOKED' ${uf}`),
      db.query(`SELECT COUNT(*) FROM audit_logs WHERE event_type='Data Accessed' ${uf}`),
    ]);

    const activityRes = await db.query(
      `SELECT TO_CHAR(created_at,'YYYY-MM-DD') as date, COUNT(*) as count
       FROM consents WHERE created_at >= NOW() - INTERVAL '90 days' ${uf}
       GROUP BY date ORDER BY date ASC`
    );

    const distRes = await db.query(
      `SELECT data_type, COUNT(*) as count,
       ROUND(COUNT(*)*100.0/NULLIF((SELECT COUNT(*) FROM user_data ${uw}),0),2) as percentage
       FROM user_data ${uw} GROUP BY data_type`
    );

    // Admin-only: user breakdown
    let userBreakdown = null;
    if (isAdmin) {
      const ubRes = await db.query(
        `SELECT u.name, u.email, u.role,
         (SELECT COUNT(*) FROM consents WHERE user_id=u.id) as consent_count,
         (SELECT COUNT(*) FROM user_data WHERE user_id=u.id) as data_count
         FROM users u ORDER BY u.created_at DESC`
      );
      userBreakdown = ubRes.rows;
    }

    return {
      total_data: parseInt(totalData.rows[0].count),
      active_consents: parseInt(activeConsents.rows[0].count),
      revoked_consents: parseInt(revokedConsents.rows[0].count),
      total_access_events: parseInt(accessEvents.rows[0].count),
      consent_activity_over_time: activityRes.rows.map(r => ({ date: r.date, count: parseInt(r.count) })),
      data_type_distribution: distRes.rows.map(r => ({ type: r.data_type, count: parseInt(r.count), percentage: parseFloat(r.percentage) })),
      user_breakdown: userBreakdown,
    };
  }
}
module.exports = new AnalyticsService();
