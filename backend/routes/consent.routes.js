const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/consent.controller');
const protect = require('../middleware/auth.middleware');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');

router.use(protect);
router.get('/',              ctrl.listConsents);
router.post('/',             v.createConsent, validate, ctrl.createConsent);
router.post('/approve',      ctrl.approveConsent);
router.post('/reject',       ctrl.rejectConsent);
router.post('/revoke',       ctrl.revokeConsent);
router.post('/bulk',         ctrl.bulkAction);
router.get('/:id/history',   ctrl.getHistory);
router.get('/:id/access-logs', ctrl.getAccessLogs);

module.exports = router;
