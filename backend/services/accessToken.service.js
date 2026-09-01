const db = require('../database/db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'zeroshare_secret_key';

class AccessTokenService {
  // Issue a scoped access token after consent approval
  async issue(consentId) {
    const consentRes = await db.query(
      `SELECT c.*, a.id as app_id FROM consents c
       LEFT JOIN applications a ON a.name = c.app_name
       WHERE c.id=$1 AND c.status='GRANTED'`, [consentId]
    );
    if (!consentRes.rows[0]) throw new Error('Consent not found or not approved');
    const consent = consentRes.rows[0];

    // Build scope from consent_assets if available, else use data_type
    const assetsRes = await db.query(
      `SELECT ud.data_type, ca.permission FROM consent_assets ca
       JOIN user_data ud ON ca.asset_id = ud.id
       WHERE ca.consent_id=$1 AND ca.status='APPROVED'`, [consentId]
    );

    const scope = assetsRes.rows.length > 0
      ? assetsRes.rows.map(r => `${r.data_type.toLowerCase().replace(/\s+/g,'-')}:${r.permission.toLowerCase()}`)
      : [`${consent.data_type.toLowerCase().replace(/\s+/g,'-')}:read`];

    // JWT payload — no personal data inside token
    const payload = {
      sub: consent.app_name,
      consentId: consent.id,
      userId: consent.user_id,
      scope,
      purpose: consent.purpose,
      exp: consent.expires_at ? Math.floor(new Date(consent.expires_at).getTime() / 1000) : Math.floor(Date.now()/1000) + 86400,
    };

    const token = jwt.sign(payload, JWT_SECRET);
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');

    // Revoke any existing active tokens for this consent
    await db.query(`UPDATE access_tokens SET status='REVOKED', revoked_at=NOW() WHERE consent_id=$1 AND status='ACTIVE'`, [consentId]);

    await db.query(
      `INSERT INTO access_tokens (consent_id, application_id, token_hash, scope, purpose, expires_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE')`,
      [consentId, consent.app_id || null, token_hash, JSON.stringify(scope), consent.purpose, consent.expires_at]
    );

    return { token, scope, expires_at: consent.expires_at };
  }

  // Validate a scoped access token — full authorization check
  async validate(token, requestedAsset, userId) {
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return { valid: false, reason: 'TOKEN_INVALID' };
    }

    const token_hash = crypto.createHash('sha256').update(token).digest('hex');

    // Check token in DB
    const tokenRes = await db.query(
      `SELECT at.*, c.status as consent_status, c.expires_at, c.user_id
       FROM access_tokens at
       JOIN consents c ON at.consent_id = c.id
       WHERE at.token_hash=$1`, [token_hash]
    );
    if (!tokenRes.rows[0]) return { valid: false, reason: 'TOKEN_NOT_FOUND' };
    const t = tokenRes.rows[0];

    if (t.status !== 'ACTIVE')           return { valid: false, reason: 'TOKEN_REVOKED' };
    if (t.consent_status !== 'GRANTED')  return { valid: false, reason: 'CONSENT_NOT_ACTIVE' };
    if (t.expires_at && new Date(t.expires_at) < new Date()) return { valid: false, reason: 'TOKEN_EXPIRED' };

    // Check scope
    const scope = typeof t.scope === 'string' ? JSON.parse(t.scope) : t.scope;
    const assetKey = requestedAsset.toLowerCase().replace(/\s+/g, '-');
    const inScope = scope.some(s => s.startsWith(assetKey) || s.includes(assetKey));
    if (!inScope) return { valid: false, reason: 'ASSET_NOT_IN_SCOPE' };

    return { valid: true, consentId: t.consent_id, userId: t.user_id, scope, decoded };
  }

  // Revoke all tokens for a consent
  async revokeByConsent(consentId) {
    await db.query(
      `UPDATE access_tokens SET status='REVOKED', revoked_at=NOW() WHERE consent_id=$1`,
      [consentId]
    );
  }

  async getByConsent(consentId) {
    const res = await db.query(
      `SELECT id, scope, purpose, issued_at, expires_at, status FROM access_tokens WHERE consent_id=$1 ORDER BY issued_at DESC`,
      [consentId]
    );
    return res.rows;
  }
}

module.exports = new AccessTokenService();
