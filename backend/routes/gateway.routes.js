const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const gateway = require('../services/gateway.service');
const accessTokenService = require('../services/accessToken.service');
const anomalyService = require('../services/anomaly.service');
const auditChain = require('../services/auditChain.service');

// POST /api/gateway/access — third-party requests data through gateway
router.post('/access', async (req, res) => {
  const { token, asset } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'];
  const device = req.headers['user-agent'];

  if (!token || !asset) return res.status(400).json({ success: false, error: 'token and asset required' });

  try {
    const result = await gateway.authorize(token, asset, ip, device);
    if (!result.allowed) {
      return res.status(result.status).json({ success: false, error: result.reason });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/gateway/token — issue scoped token after consent approval (user auth required)
router.post('/token', protect, async (req, res) => {
  try {
    const { consentId } = req.body;
    const result = await accessTokenService.issue(consentId);
    await auditChain.log({
      userId: req.userId, eventType: 'TOKEN_ISSUED',
      appName: null, dataAccessed: null, status: 'SUCCESS',
      ip: req.ip, device: req.headers['user-agent']
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/gateway/tokens/:consentId — list tokens for a consent
router.get('/tokens/:consentId', protect, async (req, res) => {
  try {
    const tokens = await accessTokenService.getByConsent(req.params.consentId);
    res.json({ success: true, data: tokens });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/gateway/access-logs — all access logs
router.get('/access-logs', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await gateway.getAccessLogs(req.userId, req.userRole, parseInt(page), parseInt(limit));
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/gateway/anomalies — anomaly events
router.get('/anomalies', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await anomalyService.getAll(req.userId, req.userRole, parseInt(page), parseInt(limit));
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/gateway/anomalies/:id/resolve
router.put('/anomalies/:id/resolve', protect, async (req, res) => {
  try {
    const result = await anomalyService.resolve(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/gateway/audit/verify — verify audit chain integrity
router.get('/audit/verify', protect, async (req, res) => {
  try {
    const result = await auditChain.verifyChain();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
