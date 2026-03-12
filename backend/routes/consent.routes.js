const express = require('express');
const router = express.Router();
const consentController = require('../controllers/consent.controller');

router.get('/list', consentController.listConsents);
router.post('/approve', consentController.approveConsent);
router.post('/reject', consentController.rejectConsent);

module.exports = router;
