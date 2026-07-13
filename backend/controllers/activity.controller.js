const activityService = require('../services/activity.service');

exports.getRecentActivity = async (req, res) => {
  try {
    const data = await activityService.getRecentActivity(req.userId, req.userRole);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
};
