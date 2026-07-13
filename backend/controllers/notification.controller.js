const notifService = require('../services/notification.service');

exports.listNotifications = async (req, res) => {
  try {
    const data = await notifService.getAll();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const data = await notifService.markRead(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
};
