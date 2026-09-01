const db = require('../database/db');

class AnomalyService {
  // Called after every successful data access
  async check(applicationId, userId, accessLogId) {
    if (!applicationId) return;

    const now = new Date();
    const fiveMinAgo = new Date(now - 5 * 60 * 1000);
    const oneHourAgo = new Date(now - 60 * 60 * 1000);

    // Gather behavioral features
    const [recentMin, recentHour, nightAccess, sensitiveCount, failedCount, uniqueAssets] = await Promise.all([
      // Requests in last 5 minutes
      db.query(`SELECT COUNT(*) FROM access_logs WHERE application_id=$1 AND timestamp > $2`, [applicationId, fiveMinAgo]),
      // Requests in last hour
      db.query(`SELECT COUNT(*) FROM access_logs WHERE application_id=$1 AND timestamp > $2`, [applicationId, oneHourAgo]),
      // Night-time access (11pm - 5am)
      db.query(`SELECT COUNT(*) FROM access_logs WHERE application_id=$1 AND EXTRACT(HOUR FROM timestamp) BETWEEN 23 AND 5 AND timestamp > $2`, [applicationId, oneHourAgo]),
      // Sensitive asset accesses in last hour
      db.query(
        `SELECT COUNT(*) FROM access_logs al JOIN user_data ud ON al.asset_id=ud.id
         WHERE al.application_id=$1 AND ud.sensitivity_level IN ('HIGH','VERY_HIGH') AND al.timestamp > $2`,
        [applicationId, oneHourAgo]
      ),
      // Failed access attempts in last hour
      db.query(`SELECT COUNT(*) FROM access_logs WHERE application_id=$1 AND result='DENIED' AND timestamp > $2`, [applicationId, oneHourAgo]),
      // Unique assets accessed in last hour
      db.query(`SELECT COUNT(DISTINCT asset_id) FROM access_logs WHERE application_id=$1 AND timestamp > $2`, [applicationId, oneHourAgo]),
    ]);

    const features = {
      requests_per_5min:  parseInt(recentMin.rows[0].count),
      requests_per_hour:  parseInt(recentHour.rows[0].count),
      night_access:       parseInt(nightAccess.rows[0].count),
      sensitive_accesses: parseInt(sensitiveCount.rows[0].count),
      failed_attempts:    parseInt(failedCount.rows[0].count),
      unique_assets:      parseInt(uniqueAssets.rows[0].count),
    };

    const { score, reasons } = this._isolationScore(features);

    if (score >= 50) {
      const severity = score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW';
      await db.query(
        `INSERT INTO anomaly_events (application_id, user_id, access_log_id, anomaly_score, severity, reason, status)
         VALUES ($1,$2,$3,$4,$5,$6,'OPEN')`,
        [applicationId, userId, accessLogId, score, severity, reasons.join('; ')]
      );

      // Notify user and admin
      const notifService = require('./notification.service');
      if (userId) {
        await notifService.create(userId, 'Anomaly Detected',
          `🚨 Suspicious activity detected from application. Score: ${score}/100. Reason: ${reasons[0]}`);
      }
      // Notify all admins
      const admins = await db.query(`SELECT id FROM users WHERE role='admin'`);
      for (const admin of admins.rows) {
        await notifService.create(admin.id, 'Security Alert',
          `⚠️ Anomaly detected (score ${score}/100): ${reasons.join(', ')}`);
      }
    }

    return { score, reasons };
  }

  // Isolation Forest-inspired scoring (rule-based approximation)
  _isolationScore(f) {
    let score = 0;
    const reasons = [];

    if (f.requests_per_5min > 20) {
      score += 35;
      reasons.push(`High frequency: ${f.requests_per_5min} requests in 5 minutes`);
    } else if (f.requests_per_5min > 10) {
      score += 15;
      reasons.push(`Elevated frequency: ${f.requests_per_5min} requests in 5 minutes`);
    }

    if (f.requests_per_hour > 80) {
      score += 25;
      reasons.push(`Excessive hourly requests: ${f.requests_per_hour}`);
    } else if (f.requests_per_hour > 40) {
      score += 10;
    }

    if (f.sensitive_accesses > 5) {
      score += 20;
      reasons.push(`Multiple sensitive data accesses: ${f.sensitive_accesses}`);
    }

    if (f.failed_attempts > 5) {
      score += 15;
      reasons.push(`Repeated authorization failures: ${f.failed_attempts}`);
    }

    if (f.night_access > 3) {
      score += 10;
      reasons.push(`Unusual access time (night hours)`);
    }

    if (f.unique_assets > 8) {
      score += 10;
      reasons.push(`Accessing too many different data fields: ${f.unique_assets}`);
    }

    return { score: Math.min(score, 100), reasons: reasons.length ? reasons : ['Normal behavior'] };
  }

  async getAll(userId, role, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const isAdmin = role === 'admin';
    const where = isAdmin ? '' : 'WHERE ae.user_id=$3';
    const params = isAdmin ? [limit, offset] : [limit, offset, userId];

    const countRes = await db.query(
      `SELECT COUNT(*) FROM anomaly_events ${isAdmin ? '' : 'WHERE user_id=$1'}`,
      isAdmin ? [] : [userId]
    );

    const rows = await db.query(
      `SELECT ae.*, a.name as app_name FROM anomaly_events ae
       LEFT JOIN applications a ON ae.application_id = a.id
       ${where} ORDER BY ae.created_at DESC LIMIT $1 OFFSET $2`,
      params
    );

    return { anomalies: rows.rows, total: parseInt(countRes.rows[0].count), page, totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit) };
  }

  async resolve(id) {
    const res = await db.query(`UPDATE anomaly_events SET status='RESOLVED' WHERE id=$1 RETURNING *`, [id]);
    return res.rows[0];
  }

  async getStats() {
    const res = await db.query(
      `SELECT severity, COUNT(*) as count FROM anomaly_events WHERE status='OPEN' GROUP BY severity`
    );
    return res.rows;
  }
}

module.exports = new AnomalyService();
