const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth.controller');
const protect = require('../middleware/auth.middleware');
const { loginLimiter, forgotPasswordLimiter, otpLimiter } = require('../middleware/rateLimiter');

router.post('/register', auth.register);
router.post('/login', loginLimiter, auth.login);
router.post('/verify-otp', otpLimiter, auth.verifyOTP);
router.post('/forgot-password', forgotPasswordLimiter, auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.get('/me', protect, auth.me);
router.post('/2fa/toggle', protect, auth.toggle2FA);
router.get('/sessions', protect, auth.getSessions);
router.delete('/sessions/all', protect, auth.revokeAllSessions);
router.delete('/sessions/:id', protect, auth.revokeSession);

module.exports = router;
