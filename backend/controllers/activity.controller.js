const activityService = require('../services/activity.service');

exports.getRecentActivity = async (req, res) => {
  try {
    const activity = await activityService.getRecentActivity();
    res.status(200).json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent activity' });
  }
};
