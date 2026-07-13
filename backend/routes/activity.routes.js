const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/activity.controller');
const protect = require('../middleware/auth.middleware');
router.use(protect);
router.get('/', ctrl.getRecentActivity);
module.exports = router;
