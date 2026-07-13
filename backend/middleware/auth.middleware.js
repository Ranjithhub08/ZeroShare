const jwt = require('jsonwebtoken');
const sessionService = require('../services/session.service');
const JWT_SECRET = process.env.JWT_SECRET || 'zeroshare_secret_key';

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ success: false, error: 'No token provided' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Session validity check (only for tokens that have a sessionId)
    if (decoded.sessionId) {
      const revoked = await sessionService.isSessionRevoked(decoded.sessionId);
      if (revoked)
        return res.status(401).json({ success: false, error: 'Session revoked. Please log in again.' });
      // Update last used timestamp asynchronously
      sessionService.updateLastUsed(decoded.sessionId).catch(() => {});
    }

    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    req.sessionId = decoded.sessionId;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};
