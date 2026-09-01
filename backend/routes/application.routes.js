const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const admin = require('../middleware/admin.middleware');
const appService = require('../services/application.service');
const policyService = require('../services/policy.service');

router.use(protect);

// GET all applications
router.get('/', async (req, res) => {
  try {
    const apps = await appService.getAll();
    res.json({ success: true, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single application
router.get('/:id', async (req, res) => {
  try {
    const app = await appService.getById(req.params.id);
    if (!app) return res.status(404).json({ success: false, error: 'Not found' });
    const stats = await appService.getStats(req.params.id);
    res.json({ success: true, data: { ...app, ...stats } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create application (admin only)
router.post('/', admin, async (req, res) => {
  try {
    const app = await appService.create(req.body);
    res.json({ success: true, data: app });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update status (admin only)
router.put('/:id/status', admin, async (req, res) => {
  try {
    const app = await appService.updateStatus(req.params.id, req.body.status);
    res.json({ success: true, data: app });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST policy check — is this data allowed for this purpose?
router.post('/policy/check', async (req, res) => {
  try {
    const { purpose, data_types } = req.body;
    const results = (data_types || []).map(dt => ({
      data_type: dt,
      ...policyService.isAllowed(purpose, dt),
      sensitivity: policyService.getSensitivity(dt),
    }));
    const minimization = policyService.minimize(purpose, data_types || []);
    res.json({ success: true, results, minimization, purpose_risk: policyService.getPurposeRisk(purpose) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
