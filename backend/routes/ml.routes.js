const express = require('express');
const router = express.Router();
const http = require('http');
const protect = require('../middleware/auth.middleware');
const consentService = require('../services/consent.service');
const db = require('../database/db');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

function proxyToML(path, reqBody) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(reqBody);
    const req = http.request(
      `${ML_SERVICE_URL}${path}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 15000 },
      (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => resolve(JSON.parse(data)));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('ML service timeout')); });
    req.write(body);
    req.end();
  });
}

// POST /api/ml/score — score a consent before submitting
router.post('/score', protect, async (req, res) => {
  try {
    const result = await proxyToML('/score', req.body);
    res.json(result);
  } catch (err) {
    // Return a safe fallback so the UI never crashes
    res.json({ score: 0, risk_level: 'low', confidence: 'unavailable', factors: ['ML service not available — using default'] });
  }
});

// POST /api/ml/analyze-website — real website risk analysis (Feature 7: saves history)
router.post('/analyze-website', protect, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    const result = await proxyToML('/analyze-website', { url });
    // Save to history (Feature 7)
    if (result.score !== undefined) {
      await db.query(
        `INSERT INTO website_risk_history (url, domain, score, risk_level, factors) VALUES ($1,$2,$3,$4,$5)`,
        [result.url || url, result.domain || '', result.score, result.risk_level, JSON.stringify(result.factors || [])]
      ).catch(() => { /* non-fatal */ });
    }
    // Attach history to result
    const history = await db.query(
      `SELECT score, risk_level, analyzed_at FROM website_risk_history WHERE domain = $1 ORDER BY analyzed_at DESC LIMIT 10`,
      [result.domain || '']
    ).catch(() => ({ rows: [] }));
    result.history = history.rows;
    res.json(result);
  } catch (err) {
    res.json({ score: 0, risk_level: 'unknown', factors: ['Website analysis unavailable — ML service offline'], fetch_success: false, history: [] });
  }
});

// POST /api/ml/check-breach — Feature 1: data breach check
router.post('/check-breach', protect, async (req, res) => {
  try {
    const result = await proxyToML('/check-breach', req.body);
    res.json(result);
  } catch (err) {
    res.status(503).json({ error: 'ML service offline' });
  }
});

// POST /api/ml/check-phishing — Feature 2: phishing URL detector
router.post('/check-phishing', protect, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    const result = await proxyToML('/check-phishing', { url });
    res.json(result);
  } catch (err) {
    res.status(503).json({ error: 'ML service offline' });
  }
});

// POST /api/ml/suggest-duration — Feature 5: smart duration recommendation
router.post('/suggest-duration', protect, async (req, res) => {
  try {
    const result = await proxyToML('/suggest-duration', req.body);
    res.json(result);
  } catch {
    res.json({ suggested_duration: null, reason: 'ML service offline' });
  }
});

// POST /api/ml/check-geo-risk — Feature 10: geo-risk detector
router.post('/check-geo-risk', protect, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    const result = await proxyToML('/check-geo-risk', { url });
    res.json(result);
  } catch (err) {
    res.json({ risk_level: 'unknown', verdict: 'Geo-risk check unavailable', flags: [], safe_signals: [] });
  }
});

// POST /api/ml/check-minimization — Feature 9: data minimization checker
router.post('/check-minimization', protect, async (req, res) => {
  try {
    const { app_name, data_type, purpose } = req.body;
    if (!app_name || !data_type || !purpose) return res.status(400).json({ error: 'app_name, data_type, and purpose are required' });
    const result = await proxyToML('/check-minimization', { app_name, data_type, purpose });
    res.json(result);
  } catch (err) {
    res.json({ excessive: false, severity: 'low', verdict: 'ML service offline', flags: [], safe_signals: [] });
  }
});

// GET /api/ml/permission-creep — Feature 6: detect permission creep
router.get('/permission-creep', protect, async (req, res) => {
  try {
    const { app_name } = req.query;
    if (!app_name) return res.status(400).json({ error: 'app_name required' });
    const result = await consentService.detectPermissionCreep(app_name);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check permission creep' });
  }
});

// GET /api/ml/risk-trends — Feature 3: which requesters get denied most
router.get('/risk-trends', protect, async (req, res) => {
  try {
    const trends = await consentService.getRiskTrends();
    res.json({ success: true, data: trends });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch risk trends' });
  }
});

// GET /api/ml/anomaly — Feature 4: detect anomaly for a given app + data_type
router.get('/anomaly', protect, async (req, res) => {
  try {
    const { app_name, data_type } = req.query;
    if (!app_name || !data_type) return res.status(400).json({ error: 'app_name and data_type required' });
    const result = await consentService.detectAnomaly(app_name, data_type);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check anomaly' });
  }
});

// GET /api/ml/privacy-summary — Feature 11: AI summary of consent history
router.get('/privacy-summary', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    // Fetch all consents for this user
    const result = await db.query(
      `SELECT app_name, data_type, purpose, duration, status, risk_level, risk_score, expires_at, created_at
       FROM consents WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    const consents = result.rows;
    if (consents.length === 0) {
      return res.json({ summary: "You haven't shared any data yet. Grant your first consent to see your privacy summary here.", stats: {}, insights: [], score: 100 });
    }

    const granted = consents.filter(c => c.status === 'GRANTED');
    const denied  = consents.filter(c => c.status === 'DENIED');
    const revoked = consents.filter(c => c.status === 'REVOKED');
    const pending = consents.filter(c => c.status === 'PENDING');

    const now = new Date();
    const expiringSoon = granted.filter(c => c.expires_at && new Date(c.expires_at) > now && (new Date(c.expires_at) - now) < 7 * 24 * 60 * 60 * 1000);
    const highRisk = granted.filter(c => c.risk_level === 'high');

    // Unique data types shared
    const sharedTypes = [...new Set(granted.map(c => c.data_type.toLowerCase()))];
    const uniqueApps  = [...new Set(granted.map(c => c.app_name))];

    // Privacy score: start at 100, deduct for risky patterns
    let privacyScore = 100;
    privacyScore -= highRisk.length * 10;
    privacyScore -= expiringSoon.length * 5;
    privacyScore -= granted.filter(c => !c.expires_at).length * 3; // permanent consents
    privacyScore = Math.max(0, Math.min(100, privacyScore));

    // Build insights
    const insights = [];
    if (highRisk.length > 0) insights.push(`🔴 You have ${highRisk.length} high-risk active consent${highRisk.length > 1 ? 's' : ''} — consider reviewing them.`);
    if (expiringSoon.length > 0) insights.push(`⏰ ${expiringSoon.length} consent${expiringSoon.length > 1 ? 's' : ''} expire within 7 days — renew or revoke soon.`);
    const permanent = granted.filter(c => !c.expires_at);
    if (permanent.length > 0) insights.push(`♾️ ${permanent.length} consent${permanent.length > 1 ? 's' : ''} have no expiry date (permanent access) — consider adding time limits.`);
    if (denied.length > 0) insights.push(`✅ You've denied ${denied.length} request${denied.length > 1 ? 's' : ''} — good job protecting your data.`);
    if (revoked.length > 0) insights.push(`🔒 You've revoked ${revoked.length} consent${revoked.length > 1 ? 's' : ''} in the past.`);
    if (sharedTypes.length > 5) insights.push(`📊 You're sharing ${sharedTypes.length} different types of data — review if all are still necessary.`);

    // Natural language summary
    const riskLabel = privacyScore >= 80 ? 'strong' : privacyScore >= 60 ? 'moderate' : 'weak';
    const summary = [
      `Your privacy health is ${riskLabel} (${privacyScore}/100).`,
      granted.length > 0
        ? `You currently share data with ${uniqueApps.length} app${uniqueApps.length > 1 ? 's' : ''}, covering ${sharedTypes.length} type${sharedTypes.length > 1 ? 's' : ''} of personal data (${sharedTypes.slice(0,4).join(', ')}${sharedTypes.length > 4 ? '...' : ''}).`
        : 'You have no active data-sharing consents.',
      denied.length > 0 ? `You've denied ${denied.length} request${denied.length > 1 ? 's' : ''} and revoked ${revoked.length}.` : '',
      expiringSoon.length > 0 ? `⚠️ ${expiringSoon.length} consent${expiringSoon.length > 1 ? 's' : ''} expire in the next 7 days.` : '',
    ].filter(Boolean).join(' ');

    res.json({
      summary,
      score: privacyScore,
      stats: {
        total: consents.length,
        granted: granted.length,
        denied: denied.length,
        revoked: revoked.length,
        pending: pending.length,
        high_risk_active: highRisk.length,
        expiring_soon: expiringSoon.length,
        unique_apps: uniqueApps.length,
        unique_data_types: sharedTypes.length,
        permanent_consents: permanent.length,
      },
      insights,
      top_apps: uniqueApps.slice(0, 5),
      shared_data_types: sharedTypes,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate privacy summary' });
  }
});

// GET /api/ml/health — ML service status
router.get('/health', protect, async (req, res) => {
  try {
    const result = await new Promise((resolve, reject) => {
      const r = http.request(`${ML_SERVICE_URL}/health`, { timeout: 3000 }, (resp) => {
        let d = '';
        resp.on('data', c => { d += c; });
        resp.on('end', () => resolve(JSON.parse(d)));
      });
      r.on('error', reject);
      r.on('timeout', () => { r.destroy(); reject(new Error('timeout')); });
      r.end();
    });
    res.json(result);
  } catch {
    res.json({ status: 'offline' });
  }
});

module.exports = router;
