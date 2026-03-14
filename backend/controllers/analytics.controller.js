const analyticsService = require('../services/analytics.service');

exports.getDashboardAnalytics = async (req, res) => {
  try {
    const stats = await analyticsService.getDashboardStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard analytics'
    });
  }
};
