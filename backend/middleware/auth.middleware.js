const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'zeroshare_secret_key';

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ success: false, error: 'No token provided' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};
