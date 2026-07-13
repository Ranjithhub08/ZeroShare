const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analytics.controller');
const protect = require('../middleware/auth.middleware');
router.use(protect);
router.get('/', ctrl.getDashboardAnalytics);
module.exports = router;
