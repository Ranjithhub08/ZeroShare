const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const path = require('path');
const helmet = require('helmet');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const wsManager = require('./services/ws.manager');

const app = express();
const PORT = process.env.PORT || 5001;

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Body parsing — limit payload size to prevent abuse
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Route Imports
const authRoutes = require('./routes/auth.routes');
const consentRoutes = require('./routes/consent.routes');
const auditRoutes = require('./routes/audit.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationRoutes = require('./routes/notification.routes');
const activityRoutes = require('./routes/activity.routes');
const dataRoutes = require('./routes/data.routes');
const searchRoutes = require('./routes/search.routes');
const userRoutes = require('./routes/user.routes');

// Route Mounting
app.use('/api/auth', authRoutes);
app.use('/api/consents', consentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/user', userRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'ZeroShare API is running' });
});

// Consent Auto-Expiry job — runs every 5 minutes
const consentService = require('./services/consent.service');
setInterval(async () => {
  try {
    const expired = await consentService.expireConsents();
    if (expired > 0) console.log(`[Auto-Expiry] Revoked ${expired} expired consent(s).`);
  } catch (err) {
    console.error('[Auto-Expiry] Error:', err.message);
  }
}, 5 * 60 * 1000);

// Start HTTP + WebSocket Server
const server = http.createServer(app);

// WebSocket server — real-time notifications
const wss = new WebSocketServer({ server });
const JWT_SECRET = process.env.JWT_SECRET || 'zeroshare_secret_key';

wss.on('connection', (ws, req) => {
  try {
    const url = new URL(req.url, `http://localhost`);
    const token = url.searchParams.get('token');
    if (!token) { ws.close(1008, 'No token'); return; }
    const decoded = jwt.verify(token, JWT_SECRET);
    wsManager.register(decoded.userId, ws);
    ws.on('close', () => wsManager.unregister(decoded.userId, ws));
    ws.send(JSON.stringify({ type: 'connected', message: 'Real-time notifications active' }));
  } catch {
    ws.close(1008, 'Invalid token');
  }
});

server.listen(PORT, () => {
  console.log(`ZeroShare API running on port ${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}`);
  // Run expiry check immediately on start
  consentService.expireConsents().catch(() => {});
});
