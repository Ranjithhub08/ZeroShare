const consentService = require('../services/consent.service');

exports.listConsents = async (req, res) => {
  try {
    const consents = await consentService.getAllConsents();
    res.status(200).json(consents);
  } catch (error) {
    console.error('Error fetching consents:', error);
    res.status(500).json({ error: 'Failed to fetch consent requests' });
  }
};

exports.approveConsent = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Consent ID is required' });

    const updated = await consentService.updateConsentStatus(id, 'GRANTED');
    res.status(200).json(updated);
  } catch (error) {
    console.error('Error approving consent:', error);
    res.status(500).json({ error: error.message || 'Failed to approve consent' });
  }
};

exports.rejectConsent = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Consent ID is required' });

    const updated = await consentService.updateConsentStatus(id, 'DENIED');
    res.status(200).json(updated);
  } catch (error) {
    console.error('Error rejecting consent:', error);
    res.status(500).json({ error: error.message || 'Failed to reject consent' });
  }
};
