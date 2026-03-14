const consentService = require('../services/consent.service');

exports.listConsents = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'created_at', sortDir = 'DESC' } = req.query;
    const result = await consentService.getAllConsents(page, limit, sortBy, sortDir);
    res.status(200).json({
      success: true,
      data: result.consents,
      count: result.total,
      page: result.page,
      totalPages: result.totalPages
    });
  } catch (error) {
    console.error('Error fetching consents:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch consent requests' });
  }
};

exports.approveConsent = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: 'Consent ID is required' });

    const updated = await consentService.updateConsentStatus(id, 'GRANTED');
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error approving consent:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to approve consent' });
  }
};

exports.rejectConsent = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: 'Consent ID is required' });

    const updated = await consentService.updateConsentStatus(id, 'DENIED');
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error rejecting consent:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to reject consent' });
  }
};
