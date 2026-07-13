const consentService = require('../services/consent.service');

exports.createConsent = async (req, res) => {
  try {
    const { app_name, data_type, purpose, duration } = req.body;
    if (!app_name || !data_type || !purpose || !duration) {
      return res.status(400).json({ success: false, error: 'app_name, data_type, purpose, and duration are required' });
    }
    const result = await consentService.createConsent(req.userId, { app_name, data_type, purpose, duration });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create consent' });
  }
};

exports.listConsents = async (req, res) => {
  try {
    const { page=1, limit=10, sortBy='created_at', sortDir='DESC' } = req.query;
    const result = await consentService.getConsents(req.userId, req.userRole, page, limit, sortBy, sortDir);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch consents' });
  }
};

exports.approveConsent = async (req, res) => {
  try {
    const updated = await consentService.updateConsentStatus(req.body.id, 'GRANTED', req.userId, req.userRole);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.rejectConsent = async (req, res) => {
  try {
    const updated = await consentService.updateConsentStatus(req.body.id, 'DENIED', req.userId, req.userRole);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.revokeConsent = async (req, res) => {
  try {
    const updated = await consentService.updateConsentStatus(req.body.id, 'REVOKED', req.userId, req.userRole);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
