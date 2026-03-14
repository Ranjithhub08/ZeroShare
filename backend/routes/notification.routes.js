const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

router.get('/list', notificationController.listNotifications);

module.exports = router;
