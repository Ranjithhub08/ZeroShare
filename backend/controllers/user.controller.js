const userService = require('../services/user.service');
const { generatePrivacyReport } = require('../services/report.service');

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

exports.getUserRecords = async (req, res) => {
  try {
    const records = await userService.getUserRecords(req.params.id);
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user records' });
  }
};

exports.downloadPrivacyReport = async (req, res) => {
  try {
    if (req.userRole === 'admin')
      return res.status(403).json({ success: false, error: 'Admin cannot download a personal privacy report' });
    const pdfBuffer = await generatePrivacyReport(req.userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="zeroshare-privacy-report.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Privacy report error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const deleted = await userService.deleteUser(req.params.id, req.userId);
    res.json({ success: true, data: deleted, message: `User ${deleted.name} deleted` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
