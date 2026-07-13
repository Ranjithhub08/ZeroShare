const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

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
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
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
    const result = await db.query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0)
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

exports.me = async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, error: 'User not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};
