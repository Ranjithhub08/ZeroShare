const db = require('../database/db');
const accessTokenService = require('./accessToken.service');
const anomalyService = require('./anomaly.service');
const { decrypt } = require('./encryption.service');

class AccessGateway {
  // Main authorization flow — called for every third-party data request
  async authorize(token, requestedAsset, ip, device) {
    // Step 1-2: Validate token
    const validation = await accessTokenService.validate(token, requestedAsset, null);

    if (!validation.valid) {
      await this._logAccess({ token, requestedAsset, result: 'DENIED', denial_reason: validation.reason, ip, device });
      return { allowed: false, status: 403, reason: validation.reason };
    }

    const { consentId, userId } = validation;

    // Step 3-4: Get consent and check status
    const consentRes = await db.query(
      `SELECT c.*, a.id as app_id, a.name as app_name_db, a.trust_score
       FROM consents c LEFT JOIN applications a ON a.name = c.app_name
       WHERE c.id=$1`, [consentId]
    );
    if (!consentRes.rows[0]) {
      await this._logAccess({ consentId, userId, requestedAsset, result: 'DENIED', denial_reason: 'CONSENT_NOT_FOUND', ip, device });
      return { allowed: false, status: 403, reason: 'CONSENT_NOT_FOUND' };
    }
    const consent = consentRes.rows[0];

    if (consent.status !== 'GRANTED') {
      await this._logAccess({ consentId, userId, applicationId: consent.app_id, requestedAsset, result: 'DENIED', denial_reason: `CONSENT_${consent.status}`, ip, device });
      return { allowed: false, status: 403, reason: `CONSENT_${consent.status}` };
    }

    // Step 5: Check expiry
    if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
      await db.query(`UPDATE consents SET status='EXPIRED', updated_at=NOW() WHERE id=$1`, [consentId]);
      await this._logAccess({ consentId, userId, applicationId: consent.app_id, requestedAsset, result: 'DENIED', denial_reason: 'CONSENT_EXPIRED', ip, device });
      return { allowed: false, status: 403, reason: 'CONSENT_EXPIRED' };
    }

    // Step 6: Purpose enforcement
    const policyService = require('./policy.service');
    const purposeCheck = policyService.isAllowed(consent.purpose, requestedAsset);
    if (!purposeCheck.allowed) {
      await this._logAccess({ consentId, userId, applicationId: consent.app_id, requestedAsset, result: 'DENIED', denial_reason: 'PURPOSE_MISMATCH', ip, device });
      return { allowed: false, status: 403, reason: 'PURPOSE_MISMATCH' };
    }

    // Step 7-8: Check asset is in scope
    const assetRes = await db.query(
      `SELECT ud.* FROM user_data ud WHERE ud.user_id=$1 AND LOWER(ud.data_type) LIKE LOWER($2)`,
      [userId, `%${requestedAsset}%`]
    );
    if (!assetRes.rows[0]) {
      await this._logAccess({ consentId, userId, applicationId: consent.app_id, requestedAsset, result: 'DENIED', denial_reason: 'ASSET_NOT_FOUND', ip, device });
      return { allowed: false, status: 404, reason: 'ASSET_NOT_FOUND' };
    }
    const asset = assetRes.rows[0];

    // Log successful access
    const logId = await this._logAccess({
      consentId, userId, applicationId: consent.app_id,
      assetId: asset.id, requestedAsset, result: 'SUCCESS',
      purpose: consent.purpose, ip, device
    });

    // Step 9: Run anomaly detection asynchronously
    anomalyService.check(consent.app_id, userId, logId).catch(() => {});

    // Step 10: Decrypt and return ONLY the approved field
    const value = asset.record_type === 'file'
      ? { type: 'file', file_name: asset.file_name, file_url: asset.file_url }
      : { type: 'text', value: decrypt(asset.value) };

    return {
      allowed: true,
      data: { data_type: asset.data_type, ...value },
      consent: { id: consentId, purpose: consent.purpose, expires_at: consent.expires_at },
    };
  }

  async _logAccess({ consentId, userId, applicationId, assetId, requestedAsset, result, denial_reason, purpose, ip, device }) {
    const res = await db.query(
      `INSERT INTO access_logs (user_id, application_id, consent_id, asset_id, action, purpose, result, denial_reason, ip_address, device)
       VALUES ($1,$2,$3,$4,'READ',$5,$6,$7,$8,$9) RETURNING id`,
      [userId || null, applicationId || null, consentId || null, assetId || null,
       purpose || null, result, denial_reason || null, ip || null, device || null]
    );
    return res.rows[0]?.id;
  }

  async getAccessLogs(userId, role, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const isAdmin = role === 'admin';
    const where = isAdmin ? '' : 'WHERE al.user_id = $3';
    const params = isAdmin ? [limit, offset] : [limit, offset, userId];

    const countRes = await db.query(
      `SELECT COUNT(*) FROM access_logs ${isAdmin ? '' : 'WHERE user_id=$1'}`,
      isAdmin ? [] : [userId]
    );

    const rows = await db.query(
      `SELECT al.*, a.name as app_name, ud.data_type
       FROM access_logs al
       LEFT JOIN applications a ON al.application_id = a.id
       LEFT JOIN user_data ud ON al.asset_id = ud.id
       ${where} ORDER BY al.timestamp DESC LIMIT $1 OFFSET $2`,
      params
    );

    return { logs: rows.rows, total: parseInt(countRes.rows[0].count), page, totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit) };
  }
}

module.exports = new AccessGateway();
