const express = require('express');
const router = express.Router();
const http = require('http');
const protect = require('../middleware/auth.middleware');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

function proxyToML(path, reqBody) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(reqBody);
    const req = http.request(
      `${ML_SERVICE_URL}${path}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 5000 },
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
