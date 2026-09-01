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
