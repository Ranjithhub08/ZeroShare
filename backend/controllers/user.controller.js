const userService = require('../services/user.service');
const { generatePrivacyReport } = require('../services/report.service');
const { sendEmail, templates } = require('../services/email.service');
const archiver = require('archiver');
const db = require('../database/db');
const path = require('path');
const fs = require('fs');

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

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No image file uploaded' });
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;
    const avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
    // Delete old avatar file if it exists
    const oldRes = await db.query('SELECT avatar_url FROM users WHERE id=$1', [req.userId]);
    if (oldRes.rows[0]?.avatar_url) {
      const oldFile = oldRes.rows[0].avatar_url.split('/uploads/avatars/')[1];
      if (oldFile) {
        const oldPath = path.join(__dirname, '../uploads/avatars', oldFile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    await db.query('UPDATE users SET avatar_url=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', [avatarUrl, req.userId]);
    res.json({ success: true, data: { avatar_url: avatarUrl } });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ success: false, error: 'Failed to upload avatar' });
  }
};

exports.removeAvatar = async (req, res) => {
  try {
    const oldRes = await db.query('SELECT avatar_url FROM users WHERE id=$1', [req.userId]);
    if (oldRes.rows[0]?.avatar_url) {
      const oldFile = oldRes.rows[0].avatar_url.split('/uploads/avatars/')[1];
      if (oldFile) {
        const oldPath = path.join(__dirname, '../uploads/avatars', oldFile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    await db.query('UPDATE users SET avatar_url=NULL WHERE id=$1', [req.userId]);
    res.json({ success: true, message: 'Avatar removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to remove avatar' });
  }
};

exports.exportData = async (req, res) => {
  try {
    const [profileRes, consentsRes, dataRes, logsRes, notifsRes] = await Promise.all([
      db.query('SELECT id, name, email, role, created_at FROM users WHERE id=$1', [req.userId]),
      db.query('SELECT app_name, data_type, purpose, duration, status, risk_level, created_at, expires_at FROM consents WHERE user_id=$1 ORDER BY created_at DESC', [req.userId]),
      db.query('SELECT data_type, created_at FROM user_data WHERE user_id=$1 ORDER BY created_at DESC', [req.userId]),
      db.query('SELECT event_type, app_name, status, timestamp FROM audit_logs WHERE user_id=$1 ORDER BY timestamp DESC', [req.userId]),
      db.query('SELECT event_type, message, status, created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC', [req.userId]),
    ]);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="zeroshare-my-data.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);

    const exportDate = new Date().toISOString();
    const readme = `ZeroShare — Personal Data Export\nGenerated: ${exportDate}\n\nFiles:\n- profile.json     Your account info\n- consents.json    All consent records\n- data_records.json All stored data types\n- audit_logs.json  Full access history\n- notifications.json All notifications\n`;

    archive.append(readme, { name: 'README.txt' });
    archive.append(JSON.stringify({ exported_at: exportDate, ...profileRes.rows[0] }, null, 2), { name: 'profile.json' });
    archive.append(JSON.stringify({ exported_at: exportDate, count: consentsRes.rows.length, consents: consentsRes.rows }, null, 2), { name: 'consents.json' });
    archive.append(JSON.stringify({ exported_at: exportDate, count: dataRes.rows.length, records: dataRes.rows }, null, 2), { name: 'data_records.json' });
    archive.append(JSON.stringify({ exported_at: exportDate, count: logsRes.rows.length, logs: logsRes.rows }, null, 2), { name: 'audit_logs.json' });
    archive.append(JSON.stringify({ exported_at: exportDate, count: notifsRes.rows.length, notifications: notifsRes.rows }, null, 2), { name: 'notifications.json' });

    await archive.finalize();
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ success: false, error: 'Failed to export data' });
  }
};

exports.deleteMyAccount = async (req, res) => {
  try {
    const userRes = await db.query('SELECT name, email, avatar_url FROM users WHERE id=$1', [req.userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    const { name, email, avatar_url } = userRes.rows[0];
    // Delete avatar file if exists
    if (avatar_url) {
      const oldFile = avatar_url.split('/uploads/avatars/')[1];
      if (oldFile) {
        const oldPath = path.join(__dirname, '../uploads/avatars', oldFile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    // Delete user — cascades to consents, sessions, notifications, audit_logs, user_data
    await db.query('DELETE FROM users WHERE id=$1', [req.userId]);
    // Send goodbye email
    sendEmail({ to: email, ...templates.accountDeleted(name) })
      .catch(err => console.error('[Goodbye] Email failed:', err.message));
    res.json({ success: true, message: 'Account permanently deleted' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const updated = await userService.suspendUser(req.params.id, req.userId);
    res.json({ success: true, data: updated, message: `User ${updated.name} suspended` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.unsuspendUser = async (req, res) => {
  try {
    const updated = await userService.unsuspendUser(req.params.id);
    res.json({ success: true, data: updated, message: `User ${updated.name} reinstated` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
