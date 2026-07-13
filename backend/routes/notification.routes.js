const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notification.controller');
const protect = require('../middleware/auth.middleware');
router.use(protect);
router.get('/', ctrl.listNotifications);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', ctrl.markRead);
module.exports = router;
