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
