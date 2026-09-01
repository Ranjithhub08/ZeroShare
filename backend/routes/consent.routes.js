const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/consent.controller');
const protect = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/admin.middleware');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');

router.use(protect);
router.get('/',              ctrl.listConsents);
router.post('/',             v.createConsent, validate, ctrl.createConsent);
// Admin-only: approve, reject, revoke, bulk actions
router.post('/approve',      adminOnly, ctrl.approveConsent);
router.post('/reject',       adminOnly, ctrl.rejectConsent);
router.post('/revoke',       adminOnly, ctrl.revokeConsent);
router.post('/bulk',         adminOnly, ctrl.bulkAction);
router.patch('/:id/status',  adminOnly, ctrl.updateStatus);
router.get('/:id/history',   ctrl.getHistory);
router.get('/:id/access-logs', ctrl.getAccessLogs);

module.exports = router;
