const userService = require('../services/user.service');

exports.getProfile = async (req, res) => {
  try {
    const profile = await userService.getProfile();
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updated = await userService.updateProfile(req.body);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

exports.updateNotifications = async (req, res) => {
  try {
    const updated = await userService.updateNotifications(req.body);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update notifications' });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    await userService.updatePassword(req.body.password);
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
};
