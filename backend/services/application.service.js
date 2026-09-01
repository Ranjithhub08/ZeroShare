const db = require('../database/db');

class ApplicationService {
  async getAll() {
    const res = await db.query(`SELECT * FROM applications ORDER BY created_at DESC`);
    return res.rows;
  }

  async getById(id) {
    const res = await db.query(`SELECT * FROM applications WHERE id=$1`, [id]);
    return res.rows[0];
  }

  async create({ name, type, description, trust_score }) {
    const api_key = `key-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const res = await db.query(
      `INSERT INTO applications (name, type, description, trust_score, api_key)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, type || 'app', description || '', trust_score || 0.5, api_key]
    );
    return res.rows[0];
  }

  async updateStatus(id, status) {
    const res = await db.query(
      `UPDATE applications SET status=$1 WHERE id=$2 RETURNING *`, [status, id]
    );
    return res.rows[0];
  }

  async updateTrustScore(id, trust_score) {
    const res = await db.query(
      `UPDATE applications SET trust_score=$1 WHERE id=$2 RETURNING *`, [trust_score, id]
    );
    return res.rows[0];
  }

  async getStats(id) {
    const [consents, accessLogs, anomalies] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM consents WHERE app_name=(SELECT name FROM applications WHERE id=$1)`, [id]),
      db.query(`SELECT COUNT(*) FROM access_logs WHERE application_id=$1`, [id]),
      db.query(`SELECT COUNT(*) FROM anomaly_events WHERE application_id=$1 AND status='OPEN'`, [id]),
    ]);
    return {
      total_consents: parseInt(consents.rows[0].count),
      total_accesses: parseInt(accessLogs.rows[0].count),
      open_anomalies: parseInt(anomalies.rows[0].count),
    };
  }
}

module.exports = new ApplicationService();
