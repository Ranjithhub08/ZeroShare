const notifService = require('../services/notification.service');

exports.listNotifications = async (req, res) => {
  try {
    const data = await notifService.getAll(req.userId, req.userRole);
    const unread = data.filter(n => n.status === 'unread').length;
    res.json({ success: true, data, count: data.length, unread });
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

exports.markAllRead = async (req, res) => {
  try {
    await notifService.markAllRead(req.userId, req.userRole);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
};
