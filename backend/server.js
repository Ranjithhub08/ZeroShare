const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Start Server
app.listen(PORT, () => {
  console.log(`ZeroShare API running on port ${PORT}`);
  // Run expiry check immediately on start
  consentService.expireConsents().catch(() => {});
});
