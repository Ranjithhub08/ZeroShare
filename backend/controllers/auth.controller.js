const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database/db');
const { sendEmail, templates } = require('../services/email.service');
const sessionService = require('../services/session.service');

const JWT_SECRET = process.env.JWT_SECRET || 'zeroshare_secret_key';

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, error: 'Name, email and password are required' });
  if (password.length < 8)
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0)
      return res.status(409).json({ success: false, error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'user') RETURNING id, name, email, role`,
      [name, email, hash]
    );
    const user = result.rows[0];
    const sessionId = await sessionService.createSession(user.id, req);
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, sessionId }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  try {
    const result = await db.query(
      'SELECT id, name, email, password_hash, role, two_fa_enabled, is_suspended FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    if (user.is_suspended)
      return res.status(403).json({ success: false, error: 'Your account has been suspended. Please contact support.' });

    // 2FA enabled — send OTP
    if (user.two_fa_enabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      const tempToken = crypto.randomBytes(32).toString('hex');
      await db.query(
        'UPDATE users SET otp=$1, otp_expires=$2, otp_temp_token=$3 WHERE id=$4',
        [otp, otpExpires, tempToken, user.id]
      );
      try {
        await sendEmail({ to: user.email, ...templates.otpVerification(user.name, otp) });
      } catch (e) {
        console.error('[2FA] Email failed:', e.message);
      }
      return res.json({ success: true, requires2FA: true, tempToken, email: user.email });
    }

    // No 2FA — create session and issue token
    const sessionId = await sessionService.createSession(user.id, req);
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, sessionId }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

exports.verifyOTP = async (req, res) => {
  const { tempToken, otp } = req.body;
  if (!tempToken || !otp)
    return res.status(400).json({ success: false, error: 'Token and OTP are required' });
  try {
    const result = await db.query(
      'SELECT id, name, email, role, otp, otp_expires FROM users WHERE otp_temp_token=$1',
      [tempToken]
    );
    if (result.rows.length === 0)
      return res.status(400).json({ success: false, error: 'Invalid or expired session. Please log in again.' });
    const user = result.rows[0];
    if (new Date() > new Date(user.otp_expires))
      return res.status(400).json({ success: false, error: 'OTP has expired. Please log in again.' });
    if (user.otp !== otp.toString())
      return res.status(400).json({ success: false, error: 'Invalid OTP code. Please try again.' });

    await db.query('UPDATE users SET otp=NULL, otp_expires=NULL, otp_temp_token=NULL WHERE id=$1', [user.id]);
    const sessionId = await sessionService.createSession(user.id, req);
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, sessionId }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, error: 'OTP verification failed' });
  }
};

exports.toggle2FA = async (req, res) => {
  const { enable } = req.body;
  try {
    await db.query('UPDATE users SET two_fa_enabled=$1 WHERE id=$2', [!!enable, req.userId]);
    res.json({ success: true, message: `Two-factor authentication ${enable ? 'enabled' : 'disabled'}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update 2FA setting' });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const sessions = await sessionService.getActiveSessions(req.userId);
    res.json({ success: true, data: sessions, currentSessionId: req.sessionId });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    await sessionService.revokeSession(req.params.id, req.userId);
    res.json({ success: true, message: 'Session revoked' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to revoke session' });
  }
};

exports.revokeAllSessions = async (req, res) => {
  try {
    await sessionService.revokeAllSessions(req.userId, req.sessionId);
    res.json({ success: true, message: 'All other sessions revoked' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to revoke sessions' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email is required' });
  try {
    const result = await db.query('SELECT id, name, email FROM users WHERE email=$1', [email]);
    if (result.rows.length === 0)
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await db.query('UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3', [token, expires, user.id]);
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    try {
      await sendEmail({ to: user.email, ...templates.resetPassword(user.name, resetUrl) });
    } catch (e) {
      console.error('[ForgotPassword] Email failed:', e.message);
    }
    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[ForgotPassword] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password)
    return res.status(400).json({ success: false, error: 'Token and password are required' });
  if (password.length < 8)
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  try {
    const result = await db.query(
      'SELECT id FROM users WHERE reset_token=$1 AND reset_token_expires > NOW()',
      [token]
    );
    if (result.rows.length === 0)
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2',
      [hash, result.rows[0].id]
    );
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
};

exports.me = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, two_fa_enabled, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};
