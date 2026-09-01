const db = require('../database/db');
const crypto = require('crypto');

class AuditChainService {
  // Log an event with hash chaining
  async log({ userId, eventType, appName, dataAccessed, status, ip, device }) {
    // Get last hash
    const lastRes = await db.query(
      `SELECT current_hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1`
    );
    const previousHash = lastRes.rows[0]?.current_hash || '0'.repeat(64);

    // Build current hash from event data + previous hash
    const payload = `${previousHash}|${userId}|${eventType}|${appName}|${dataAccessed}|${status}|${Date.now()}`;
    const currentHash = crypto.createHash('sha256').update(payload).digest('hex');

    const res = await db.query(
      `INSERT INTO audit_logs (user_id, event_type, app_name, data_accessed, status, ip_address, device, previous_hash, current_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [userId || null, eventType, appName || null, dataAccessed || null,
       status, ip || null, device || null, previousHash, currentHash]
    );
    return res.rows[0];
  }

  // Verify entire audit chain integrity
  async verifyChain() {
    const logs = await db.query(
      `SELECT * FROM audit_logs WHERE current_hash IS NOT NULL ORDER BY timestamp ASC`
    );

    let verified = 0;
    let tampered = 0;
    const issues = [];

    for (let i = 0; i < logs.rows.length; i++) {
      const log = logs.rows[i];
      const expectedPrev = i === 0 ? '0'.repeat(64) : logs.rows[i - 1].current_hash;

      if (log.previous_hash && log.previous_hash !== expectedPrev) {
        tampered++;
        issues.push({ id: log.id, event: log.event_type, issue: 'Hash chain broken' });
      } else {
        verified++;
      }
    }

    return {
      total: logs.rows.length,
      verified,
      tampered,
      intact: tampered === 0,
      issues,
    };
  }
}

module.exports = new AuditChainService();
