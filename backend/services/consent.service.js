const db = require('../database/db');

class ConsentService {
  async createConsent(userId, { app_name, data_type, purpose, duration }) {
    const risk_level = (() => {
      const t = data_type.toLowerCase();
      if (t.includes('id') || t.includes('passport') || t.includes('medical')) return 'high';
      if (t.includes('financial') || t.includes('resume') || t.includes('email')) return 'medium';
      return 'low';
    })();
    const res = await db.query(
      `INSERT INTO consents (user_id, app_name, data_type, purpose, duration, risk_level, status)
       VALUES ($1,$2,$3,$4,$5,$6,'PENDING') RETURNING *`,
      [userId, app_name, data_type, purpose, duration, risk_level]
    );
    return res.rows[0];
  }

  async getConsents(userId, role, page=1, limit=10, sortBy='created_at', sortDir='DESC') {
    const offset = (page-1)*limit;
    const isAdmin = role === 'admin';
    const where = isAdmin ? '' : 'WHERE user_id = $3';
    const params = isAdmin ? [limit, offset] : [limit, offset, userId];

    const countRes = await db.query(
      `SELECT COUNT(*) FROM consents ${isAdmin ? '' : 'WHERE user_id = $1'}`,
      isAdmin ? [] : [userId]
    );
    const total = parseInt(countRes.rows[0].count);

    const rows = await db.query(
      `SELECT c.*, u.name as user_name, u.email as user_email
       FROM consents c LEFT JOIN users u ON c.user_id = u.id
       ${where} ORDER BY c.${sortBy} ${sortDir} LIMIT $1 OFFSET $2`,
      params
    );
    return { consents: rows.rows, total, page: parseInt(page), totalPages: Math.ceil(total/limit) };
  }

  async updateConsentStatus(id, status, userId, role) {
    const valid = ['PENDING','GRANTED','DENIED','REVOKED'];
    if (!valid.includes(status)) throw new Error('Invalid status');
    const where = role === 'admin' ? 'WHERE id = $2' : 'WHERE id = $2 AND user_id = $3';
    const params = role === 'admin' ? [status, id] : [status, id, userId];
    const res = await db.query(
      `UPDATE consents SET status=$1, updated_at=CURRENT_TIMESTAMP ${where} RETURNING *`, params
    );
    if (res.rows.length === 0) throw new Error('Consent not found or access denied');
    return res.rows[0];
  }
}
module.exports = new ConsentService();
