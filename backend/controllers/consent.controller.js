const consentService = require('../services/consent.service');
const db = require('../database/db');
const notifService = require('../services/notification.service');

const SUPER_ADMIN_EMAIL = 'ranjithkumarhub@gmail.com';

exports.createConsent = async (req, res) => {
  try {
    const { app_name, data_type, purpose, duration, requester_type = 'app', requester_url = null } = req.body;
    // For websites, app_name can be empty (URL is used as display name)
    const isWebsite = requester_type === 'website';
    if ((!app_name && !isWebsite) || !data_type || !purpose || !duration) {
      return res.status(400).json({ success: false, error: 'data_type, purpose, and duration are required' });
    }
    if (isWebsite && !requester_url) {
      return res.status(400).json({ success: false, error: 'requester_url is required for website type' });
    }
    // Feature 4 — Anomaly detection: check if app is requesting new data type
    const anomaly = await consentService.detectAnomaly(app_name || requester_url, data_type);
    const result = await consentService.createConsent(req.userId, { app_name, data_type, purpose, duration, requester_type, requester_url });

    // Notify super-admin of new consent request
    try {
      const adminRes = await db.query('SELECT id FROM users WHERE email=$1', [SUPER_ADMIN_EMAIL]);
      if (adminRes.rows.length > 0) {
        const userRes = await db.query('SELECT name, email FROM users WHERE id=$1', [req.userId]);
        const userName = userRes.rows[0]?.name || userRes.rows[0]?.email || 'A user';
        const appLabel = app_name || requester_url || 'Unknown app';
        await notifService.create(
          adminRes.rows[0].id,
          '📋 New Consent Request',
          `${userName} has requested consent for "${appLabel}" to access their ${data_type} (Purpose: ${purpose}). Risk: ${result.risk_level?.toUpperCase()}. Please review in Admin → All Consents.`
        );
      }
    } catch (e) { /* non-fatal */ }

    res.status(201).json({ success: true, data: result, anomaly: anomaly || null });
  } catch (err) {
    console.error('createConsent error:', err);
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

// PATCH /consents/:id/status — admin shorthand used by AdminConsents page
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await consentService.updateConsentStatus(req.params.id, status, req.userId, req.userRole);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const history = await consentService.getHistory(req.params.id, req.userId, req.userRole);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getAccessLogs = async (req, res) => {
  try {
    const logs = await consentService.getAccessLogs(req.params.id, req.userId, req.userRole);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// POST /consents/:id/renew — user requests renewal of an expiring consent
exports.renewConsent = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE consents SET renewal_requested=TRUE, updated_at=NOW() WHERE id=$1 AND user_id=$2 AND status='GRANTED' RETURNING *`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Consent not found or not yours' });
    // Notify admin
    const adminRes = await db.query('SELECT id FROM users WHERE email=$1', [SUPER_ADMIN_EMAIL]);
    if (adminRes.rows.length > 0) {
      const c = result.rows[0];
      await notifService.create(adminRes.rows[0].id, '🔄 Renewal Request',
        `A user is requesting renewal for "${c.app_name}" (${c.data_type}). Please review in Admin → All Consents.`
      );
    }
    res.json({ success: true, message: 'Renewal request sent to admin', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to request renewal' });
  }
};

exports.bulkAction = async (req, res) => {
  if (req.userRole !== 'admin')
    return res.status(403).json({ success: false, error: 'Admin only' });
  const { ids, action } = req.body;
  if (!Array.isArray(ids) || !ids.length || !['APPROVE', 'REJECT'].includes(action))
    return res.status(400).json({ success: false, error: 'ids array and action (APPROVE/REJECT) required' });
  try {
    const status = action === 'APPROVE' ? 'GRANTED' : 'DENIED';
    const results = await Promise.allSettled(
      ids.map(id => consentService.updateConsentStatus(id, status, req.userId, req.userRole))
    );
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    res.json({ success: true, message: `${succeeded} consent(s) ${status.toLowerCase()}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
