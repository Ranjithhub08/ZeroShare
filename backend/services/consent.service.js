const db = require('../database/db');
const notifService = require('./notification.service');

// Parse duration string → expiry date (or null for Permanent)
function calcExpiry(duration) {
  if (!duration) return null;
  const d = duration.toLowerCase();
  if (d.includes('permanent')) return null;
  const match = d.match(/(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const now = new Date();
  if (d.includes('year')) now.setFullYear(now.getFullYear() + num);
  else if (d.includes('month')) now.setMonth(now.getMonth() + num);
  else now.setDate(now.getDate() + num); // default: days
  return now.toISOString();
}

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
    await notifService.create(userId, 'Consent Request',
      `New consent request from "${app_name}" for your ${data_type}.`);
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

    // Calculate expiry when granting
    const expires_at = status === 'GRANTED'
      ? await (async () => {
          const c = await db.query('SELECT duration, user_id FROM consents WHERE id=$1', [id]);
          return c.rows[0] ? calcExpiry(c.rows[0].duration) : null;
        })()
      : null;

    const where = role === 'admin' ? 'WHERE id = $3' : 'WHERE id = $3 AND user_id = $4';
    const params = role === 'admin'
      ? [status, expires_at, id]
      : [status, expires_at, id, userId];

    const res = await db.query(
      `UPDATE consents SET status=$1, expires_at=$2, updated_at=CURRENT_TIMESTAMP ${where} RETURNING *`,
      params
    );
    if (res.rows.length === 0) throw new Error('Consent not found or access denied');
    const consent = res.rows[0];

    // Create notification for the consent owner
    const msgMap = {
      GRANTED: `Your consent for "${consent.app_name}" (${consent.data_type}) has been approved.`,
      DENIED:  `Your consent request from "${consent.app_name}" was denied.`,
      REVOKED: `Access for "${consent.app_name}" to your ${consent.data_type} has been revoked.`,
    };
    if (msgMap[status]) {
      await notifService.create(consent.user_id, `Consent ${status}`, msgMap[status]);
    }
    return consent;
  }

  // Called by the auto-expiry job in server.js
  async expireConsents() {
    const res = await db.query(
      `UPDATE consents SET status='REVOKED', updated_at=CURRENT_TIMESTAMP
       WHERE status='GRANTED' AND expires_at IS NOT NULL AND expires_at < NOW()
       RETURNING id, user_id, app_name, data_type`
    );
    for (const c of res.rows) {
      await notifService.create(c.user_id, 'Consent Expired',
        `Your consent for "${c.app_name}" (${c.data_type}) has expired and been auto-revoked.`);
    }
    return res.rows.length;
  }
}

module.exports = new ConsentService();
