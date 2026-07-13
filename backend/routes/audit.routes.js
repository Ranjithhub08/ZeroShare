const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/audit.controller');
const protect = require('../middleware/auth.middleware');
router.use(protect);
router.get('/', ctrl.listLogs);
module.exports = router;
