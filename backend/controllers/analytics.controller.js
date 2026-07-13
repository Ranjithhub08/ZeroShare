const analyticsService = require('../services/analytics.service');

exports.getDashboardAnalytics = async (req, res) => {
  try {
    const stats = await analyticsService.getDashboardStats(req.userId, req.userRole);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
};
