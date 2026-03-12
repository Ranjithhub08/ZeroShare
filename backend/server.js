const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Config
app.use(cors());
app.use(express.json());

// Middlewares
// const errorMiddleware = require('./middleware/error.middleware');

// Routes
// const authRoutes = require('./routes/auth.routes');
// const userRoutes = require('./routes/user.routes');
// const dataRoutes = require('./routes/data.routes');
const consentRoutes = require('./routes/consent.routes');
// // app.use('/api/data', dataRoutes);
app.use('/api/consents', consentRoutes);
const auditRoutes = require('./routes/audit.routes');
app.use('/api/audit', auditRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

// app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
