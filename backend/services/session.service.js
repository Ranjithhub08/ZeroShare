const db = require('../database/db');

async function createSession(userId, req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const result = await db.query(
    `INSERT INTO sessions (user_id, ip_address, user_agent) VALUES ($1,$2,$3) RETURNING id`,
    [userId, ip, ua]
  );
  return result.rows[0].id;
}

async function getActiveSessions(userId) {
  const result = await db.query(
    `SELECT id, ip_address, user_agent, created_at, last_used_at
     FROM sessions WHERE user_id=$1 AND is_revoked=FALSE
     ORDER BY last_used_at DESC`,
    [userId]
  );
  return result.rows;
}

async function revokeSession(sessionId, userId) {
  await db.query(
    'UPDATE sessions SET is_revoked=TRUE WHERE id=$1 AND user_id=$2',
    [sessionId, userId]
  );
}

async function revokeAllSessions(userId, exceptSessionId = null) {
  if (exceptSessionId) {
    await db.query(
      'UPDATE sessions SET is_revoked=TRUE WHERE user_id=$1 AND id != $2',
      [userId, exceptSessionId]
    );
  } else {
    await db.query('UPDATE sessions SET is_revoked=TRUE WHERE user_id=$1', [userId]);
  }
}

async function updateLastUsed(sessionId) {
  await db.query('UPDATE sessions SET last_used_at=NOW() WHERE id=$1', [sessionId]);
}

async function isSessionRevoked(sessionId) {
  const result = await db.query('SELECT is_revoked FROM sessions WHERE id=$1', [sessionId]);
  if (result.rows.length === 0) return true;
  return result.rows[0].is_revoked;
}

module.exports = { createSession, getActiveSessions, revokeSession, revokeAllSessions, updateLastUsed, isSessionRevoked };
