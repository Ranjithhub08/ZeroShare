const express = require('express');
const router = express.Router();
const db = require('../database/db');
const protect = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/admin.middleware');
const notifService = require('../services/notification.service');
const { sendEmail } = require('../services/email.service');

router.use(protect, adminOnly);

// ─── 1. Live User Activity Monitor ───────────────────────────────────────────
router.get('/activity', async (req, res) => {
  try {
    const sessions = await db.query(`
      SELECT s.id, s.user_id, s.ip_address, s.user_agent, s.created_at,
             COALESCE(s.last_used_at, s.created_at) as last_used_at,
             s.is_revoked, u.name, u.email, u.role, u.is_suspended,
             CASE
               WHEN COALESCE(s.last_used_at, s.created_at) > NOW() - INTERVAL '30 minutes' THEN 'active'
               ELSE 'idle'
             END as activity_status
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.is_revoked = FALSE
        AND COALESCE(s.last_used_at, s.created_at) > NOW() - INTERVAL '24 hours'
      ORDER BY last_used_at DESC
      LIMIT 100
    `);
    res.json({ success: true, data: sessions.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 2. Threat Dashboard ─────────────────────────────────────────────────────
router.get('/threats', async (req, res) => {
  try {
    const threats = await db.query(`
      SELECT c.id, c.app_name, c.data_type, c.purpose, c.risk_level, c.risk_score,
             c.status, c.created_at, c.requester_type, c.requester_url,
             u.name as user_name, u.email as user_email
      FROM consents c
      JOIN users u ON c.user_id = u.id
      WHERE c.risk_level = 'high'
      ORDER BY c.created_at DESC
      LIMIT 100
    `);
    // Users with 3+ high-risk consents in 24h (suspicious pattern)
    const suspicious = await db.query(`
      SELECT u.id, u.name, u.email, COUNT(*) as high_risk_count
      FROM consents c JOIN users u ON c.user_id = u.id
      WHERE c.risk_level = 'high' AND c.created_at > NOW() - INTERVAL '24 hours'
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(*) >= 3
      ORDER BY high_risk_count DESC
    `);
    res.json({ success: true, threats: threats.rows, suspicious_users: suspicious.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 4. System-wide ML Report ────────────────────────────────────────────────
router.get('/ml-report', async (req, res) => {
  try {
    const [typeStats, purposeStats, riskDist, appStats, dailyTrend] = await Promise.all([
      db.query(`SELECT data_type, COUNT(*) as count, AVG(risk_score) as avg_score FROM consents GROUP BY data_type ORDER BY count DESC LIMIT 10`),
      db.query(`SELECT purpose, COUNT(*) as count FROM consents GROUP BY purpose ORDER BY count DESC LIMIT 10`),
      db.query(`SELECT risk_level, COUNT(*) as count FROM consents GROUP BY risk_level`),
      db.query(`SELECT app_name, COUNT(*) as total, COUNT(*) FILTER(WHERE risk_level='high') as high_risk, COUNT(*) FILTER(WHERE status='DENIED') as denied FROM consents GROUP BY app_name ORDER BY high_risk DESC LIMIT 10`),
      db.query(`SELECT DATE(created_at) as day, COUNT(*) as total, COUNT(*) FILTER(WHERE risk_level='high') as high_risk FROM consents WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day`),
    ]);
    res.json({
      success: true,
      top_data_types: typeStats.rows,
      top_purposes: purposeStats.rows,
      risk_distribution: riskDist.rows,
      riskiest_apps: appStats.rows,
      daily_trend: dailyTrend.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 8. Force Revoke All consents for an app ─────────────────────────────────
router.post('/force-revoke', async (req, res) => {
  try {
    const { app_name, reason } = req.body;
    if (!app_name) return res.status(400).json({ error: 'app_name required' });
    const result = await db.query(
      `UPDATE consents SET status='REVOKED', updated_at=NOW()
       WHERE app_name ILIKE $1 AND status IN ('GRANTED','PENDING')
       RETURNING id, user_id, app_name, data_type`,
      [app_name]
    );
    // Notify all affected users
    for (const c of result.rows) {
      await notifService.create(c.user_id, '🚨 Emergency Revocation',
        `Admin has force-revoked all access for "${c.app_name}" (${c.data_type}). Reason: ${reason || 'Security concern'}`
      );
    }
    res.json({ success: true, revoked: result.rows.length, affected: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 9. Audit Export (CSV) ───────────────────────────────────────────────────
router.get('/audit-export', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.id, u.name as user_name, u.email as user_email, c.app_name, c.data_type,
             c.purpose, c.duration, c.risk_level, c.risk_score, c.status,
             c.requester_type, c.requester_url, c.created_at, c.updated_at, c.expires_at
      FROM consents c JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
    `);
    const rows = result.rows;
    const headers = ['ID','User Name','User Email','App Name','Data Type','Purpose','Duration','Risk Level','Risk Score','Status','Requester Type','Requester URL','Created At','Updated At','Expires At'];
    const csv = [
      headers.join(','),
      ...rows.map(r => [
        r.id, `"${r.user_name||''}"`, `"${r.user_email||''}"`, `"${r.app_name||''}"`,
        `"${r.data_type||''}"`, `"${r.purpose||''}"`, `"${r.duration||''}"`,
        r.risk_level, r.risk_score||'', r.status,
        r.requester_type||'', `"${r.requester_url||''}"`,
        r.created_at, r.updated_at, r.expires_at||''
      ].join(','))
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="zeroshare-audit-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 10. GDPR Compliance Report ──────────────────────────────────────────────
router.get('/gdpr-report', async (req, res) => {
  try {
    const [noExpiry, highRiskGranted, noConsent, overdue, userCount, consentCount] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM consents WHERE status='GRANTED' AND expires_at IS NULL`),
      db.query(`SELECT COUNT(*) FROM consents WHERE status='GRANTED' AND risk_level='high'`),
      db.query(`SELECT COUNT(*) FROM users WHERE role='user'`),
      db.query(`SELECT COUNT(*) FROM consents WHERE status='GRANTED' AND expires_at < NOW()`),
      db.query(`SELECT COUNT(*) FROM users`),
      db.query(`SELECT COUNT(*) FROM consents`),
    ]);
    const issues = [];
    if (parseInt(noExpiry.rows[0].count) > 0)
      issues.push({ severity: 'high', issue: `${noExpiry.rows[0].count} active consents have no expiry date (GDPR Art. 5 — storage limitation)` });
    if (parseInt(highRiskGranted.rows[0].count) > 0)
      issues.push({ severity: 'medium', issue: `${highRiskGranted.rows[0].count} high-risk consents are currently active — review necessity` });
    if (parseInt(overdue.rows[0].count) > 0)
      issues.push({ severity: 'high', issue: `${overdue.rows[0].count} consents are past expiry but not yet revoked` });

    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      summary: {
        total_users: parseInt(userCount.rows[0].count),
        total_consents: parseInt(consentCount.rows[0].count),
        permanent_consents: parseInt(noExpiry.rows[0].count),
        high_risk_active: parseInt(highRiskGranted.rows[0].count),
        overdue_revocations: parseInt(overdue.rows[0].count),
        compliance_score: Math.max(0, 100 - issues.length * 20),
      },
      issues,
      status: issues.filter(i => i.severity === 'high').length === 0 ? 'COMPLIANT' : 'NEEDS_ATTENTION',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 11. Broadcast Alert to All Users ────────────────────────────────────────
router.post('/broadcast', async (req, res) => {
  try {
    const { title, message, send_email: sendMail } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message required' });
    const users = await db.query(`SELECT id, name, email FROM users WHERE role='user' AND is_suspended=FALSE`);
    let sent = 0;
    for (const u of users.rows) {
      await notifService.create(u.id, `📢 ${title}`, message);
      if (sendMail) {
        sendEmail({
          to: u.email,
          subject: `[ZeroShare Alert] ${title}`,
          html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;background:#0f0f12;color:#e4e4e7;padding:32px;border-radius:12px;">
            <h2 style="color:#a855f7">ZeroShare Security Alert</h2>
            <p>Hi <strong>${u.name}</strong>,</p>
            <h3 style="color:#f87171">${title}</h3>
            <p>${message}</p>
            <hr style="border-color:#27272a;margin:24px 0"/>
            <p style="font-size:12px;color:#52525b">ZeroShare Admin Team</p>
          </div>`
        }).catch(() => {});
      }
      sent++;
    }
    res.json({ success: true, sent, message: `Broadcast sent to ${sent} users` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 12. Pending Approval Queue ──────────────────────────────────────────────
router.get('/pending', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.id, c.app_name, c.data_type, c.purpose, c.duration, c.risk_level, c.risk_score,
             c.status, c.created_at, c.requester_type, c.requester_url, c.renewal_requested,
             u.name as user_name, u.email as user_email,
             EXTRACT(EPOCH FROM (NOW() - c.created_at))/3600 as hours_waiting
      FROM consents c JOIN users u ON c.user_id = u.id
      WHERE c.status = 'PENDING'
      ORDER BY c.created_at ASC
    `);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 13. Admin Action Log ─────────────────────────────────────────────────────
router.get('/action-log', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.created_at,
             u.name as admin_name, u.email as admin_email
      FROM admin_action_logs a
      LEFT JOIN users u ON a.admin_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 200
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Internal helper — called by consent.controller after admin actions
router.post('/log-action', async (req, res) => {
  try {
    const { action, target_type, target_id, details } = req.body;
    await db.query(
      `INSERT INTO admin_action_logs (admin_id, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5)`,
      [req.userId, action, target_type || null, target_id || null, details || null]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 14. App Registry ────────────────────────────────────────────────────────
router.get('/app-registry', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COALESCE(NULLIF(app_name,''), requester_url) as app_name,
        requester_type,
        COUNT(*) as total_requests,
        COUNT(*) FILTER(WHERE status='GRANTED') as approved,
        COUNT(*) FILTER(WHERE status='DENIED') as denied,
        COUNT(*) FILTER(WHERE status='REVOKED') as revoked,
        COUNT(*) FILTER(WHERE status='PENDING') as pending,
        COUNT(*) FILTER(WHERE risk_level='high') as high_risk,
        ROUND(AVG(risk_score)) as avg_risk_score,
        MAX(created_at) as last_request,
        COUNT(DISTINCT user_id) as unique_users
      FROM consents
      GROUP BY COALESCE(NULLIF(app_name,''), requester_url), requester_type
      ORDER BY total_requests DESC
      LIMIT 100
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 15. System Health ────────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  const http = require('http');
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  try {
    // DB check
    const dbStart = Date.now();
    await db.query('SELECT 1');
    const dbMs = Date.now() - dbStart;
    // Active sessions
    const sessions = await db.query(`SELECT COUNT(*) FROM sessions WHERE is_revoked=FALSE AND last_used_at > NOW() - INTERVAL '30 minutes'`);
    // Total users, consents
    const [userCount, consentCount, pendingCount] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM consents'),
      db.query("SELECT COUNT(*) FROM consents WHERE status='PENDING'"),
    ]);
    // ML service check
    const mlStatus = await new Promise((resolve) => {
      const r = http.request(`${ML_SERVICE_URL}/health`, { timeout: 3000 }, (resp) => {
        let d = ''; resp.on('data', c => { d += c; }); resp.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ status: 'error' }); } });
      });
      r.on('error', () => resolve({ status: 'offline' }));
      r.on('timeout', () => { r.destroy(); resolve({ status: 'offline' }); });
      r.end();
    });
    res.json({
      success: true,
      db: { status: 'online', response_ms: dbMs },
      ml: mlStatus,
      stats: {
        active_sessions: parseInt(sessions.rows[0].count),
        total_users: parseInt(userCount.rows[0].count),
        total_consents: parseInt(consentCount.rows[0].count),
        pending_consents: parseInt(pendingCount.rows[0].count),
      },
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 16. User Detail Drill-down ───────────────────────────────────────────────
router.get('/users/:id/detail', async (req, res) => {
  try {
    const { id } = req.params;
    const [userRes, consentsRes, logsRes] = await Promise.all([
      db.query('SELECT id, name, email, role, is_suspended, two_fa_enabled, created_at FROM users WHERE id=$1', [id]),
      db.query(`SELECT id, app_name, data_type, purpose, duration, status, risk_level, risk_score, created_at, expires_at FROM consents WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [id]),
      db.query(`SELECT event_type, app_name, status, timestamp FROM audit_logs WHERE user_id=$1 ORDER BY timestamp DESC LIMIT 30`, [id]),
    ]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user: userRes.rows[0], consents: consentsRes.rows, audit_logs: logsRes.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Suspicious Pattern Check (background-style) ─────────────────────────────
router.get('/suspicious', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.is_suspended,
             COUNT(c.id) as total_consents,
             COUNT(c.id) FILTER(WHERE c.risk_level='high') as high_risk,
             COUNT(c.id) FILTER(WHERE c.status='DENIED') as denied,
             MAX(c.created_at) as last_activity
      FROM users u LEFT JOIN consents c ON u.id = c.user_id
      WHERE u.role = 'user'
      GROUP BY u.id, u.name, u.email, u.is_suspended
      HAVING COUNT(c.id) FILTER(WHERE c.risk_level='high') >= 2
      ORDER BY high_risk DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
