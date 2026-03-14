const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Route Imports
const consentRoutes = require('./routes/consent.routes');
const auditRoutes = require('./routes/audit.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationRoutes = require('./routes/notification.routes');
const activityRoutes = require('./routes/activity.routes');
const dataRoutes = require('./routes/data.routes');
const searchRoutes = require('./routes/search.routes');
const userRoutes = require('./routes/user.routes');

// Route Mounting
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

// Start Server
app.listen(PORT, () => {
  console.log(`ZeroShare API running on port ${PORT}`);
});
