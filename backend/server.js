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

// Route Mounting
app.use('/api/consents', consentRoutes);
app.use('/api/audit', auditRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'ZeroShare API is running' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`ZeroShare API running on port ${PORT}`);
});
