const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth.controller');
const protect = require('../middleware/auth.middleware');
const { loginLimiter, forgotPasswordLimiter, otpLimiter } = require('../middleware/rateLimiter');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');

router.post('/register',       v.register,       validate, auth.register);
router.post('/login',          loginLimiter, v.login, validate, auth.login);
router.post('/verify-otp',     otpLimiter,   v.verifyOTP, validate, auth.verifyOTP);
router.post('/forgot-password', forgotPasswordLimiter, v.forgotPassword, validate, auth.forgotPassword);
router.post('/reset-password', v.resetPassword,  validate, auth.resetPassword);
router.get('/me',              protect, auth.me);
router.post('/2fa/toggle',     protect, auth.toggle2FA);
router.get('/sessions',        protect, auth.getSessions);
router.delete('/sessions/all', protect, auth.revokeAllSessions);
router.delete('/sessions/:id', protect, auth.revokeSession);

module.exports = router;
