const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');

router.get('/logs', auditController.listLogs);

module.exports = router;
