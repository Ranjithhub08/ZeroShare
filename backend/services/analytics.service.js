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

    // User-only: Privacy Risk Score
    let privacyRiskScore = null;
    if (!isAdmin) {
      const [highRisk, medRisk, sensitiveData] = await Promise.all([
        db.query(`SELECT COUNT(*) FROM consents WHERE user_id=$1 AND status='GRANTED' AND risk_level='high'`, [userId]),
        db.query(`SELECT COUNT(*) FROM consents WHERE user_id=$1 AND status='GRANTED' AND risk_level='medium'`, [userId]),
        db.query(`SELECT COUNT(*) FROM user_data WHERE user_id=$1 AND (data_type ILIKE '%id%' OR data_type ILIKE '%medical%' OR data_type ILIKE '%financial%' OR data_type ILIKE '%passport%')`, [userId]),
      ]);
      const h = parseInt(highRisk.rows[0].count);
      const m = parseInt(medRisk.rows[0].count);
      const s = parseInt(sensitiveData.rows[0].count);
      const raw = 100 - (h * 15) - (m * 8) - (s * 5);
      const score = Math.max(0, Math.min(100, raw));
      const grade = score >= 85 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Fair' : 'At Risk';
      privacyRiskScore = { score, grade, high_risk_consents: h, medium_risk_consents: m, sensitive_records: s };
    }

    // Admin-only: user breakdown + growth + consent status breakdown
    let userBreakdown = null;
    let userGrowth = null;
    let consentStatusBreakdown = null;
    if (isAdmin) {
      const [ubRes, ugRes, csRes] = await Promise.all([
        db.query(
          `SELECT u.name, u.email, u.role, u.is_suspended,
           (SELECT COUNT(*) FROM consents WHERE user_id=u.id) as consent_count,
           (SELECT COUNT(*) FROM user_data WHERE user_id=u.id) as data_count
           FROM users u ORDER BY u.created_at DESC`
        ),
        db.query(
          `SELECT TO_CHAR(created_at,'YYYY-MM-DD') as date, COUNT(*) as count
           FROM users WHERE created_at >= NOW() - INTERVAL '30 days'
           GROUP BY date ORDER BY date ASC`
        ),
        db.query(
          `SELECT TO_CHAR(created_at,'YYYY-MM-DD') as date,
           SUM(CASE WHEN status='GRANTED' THEN 1 ELSE 0 END) as granted,
           SUM(CASE WHEN status='DENIED' THEN 1 ELSE 0 END) as denied,
           SUM(CASE WHEN status='REVOKED' THEN 1 ELSE 0 END) as revoked,
           SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END) as pending
           FROM consents WHERE created_at >= NOW() - INTERVAL '30 days'
           GROUP BY date ORDER BY date ASC`
        ),
      ]);
      userBreakdown = ubRes.rows;
      userGrowth = ugRes.rows.map(r => ({ date: r.date, count: parseInt(r.count) }));
      consentStatusBreakdown = csRes.rows.map(r => ({
        date: r.date,
        granted: parseInt(r.granted),
        denied: parseInt(r.denied),
        revoked: parseInt(r.revoked),
        pending: parseInt(r.pending),
      }));
    }

    return {
      total_data: parseInt(totalData.rows[0].count),
      active_consents: parseInt(activeConsents.rows[0].count),
      revoked_consents: parseInt(revokedConsents.rows[0].count),
      total_access_events: parseInt(accessEvents.rows[0].count),
      consent_activity_over_time: activityRes.rows.map(r => ({ date: r.date, count: parseInt(r.count) })),
      data_type_distribution: distRes.rows.map(r => ({ type: r.data_type, count: parseInt(r.count), percentage: parseFloat(r.percentage) })),
      user_breakdown: userBreakdown,
      user_growth: userGrowth,
      consent_status_breakdown: consentStatusBreakdown,
      privacy_risk_score: privacyRiskScore,
    };
  }
}
module.exports = new AnalyticsService();
