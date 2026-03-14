const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/notifications', userController.updateNotifications);
router.put('/password', userController.updatePassword);

module.exports = router;
