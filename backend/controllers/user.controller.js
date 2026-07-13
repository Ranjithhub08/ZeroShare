const userService = require('../services/user.service');

exports.getProfile = async (req, res) => {
  try {
    const profile = await userService.getProfile(req.userId);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updated = await userService.updateProfile(req.userId, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8)
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    await userService.updatePassword(req.userId, password);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const updated = await userService.updateUserRole(req.params.id, role);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
