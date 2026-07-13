const { body, param } = require('express-validator');

// ── Auth ────────────────────────────────────────────────────────────────────

exports.register = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

exports.login = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

exports.forgotPassword = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
];

exports.resetPassword = [
  body('token')
    .notEmpty().withMessage('Reset token is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

exports.verifyOTP = [
  body('tempToken').notEmpty().withMessage('Token is required'),
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
];

// ── Consents ─────────────────────────────────────────────────────────────────

exports.createConsent = [
  body('app_name')
    .trim()
    .notEmpty().withMessage('App name is required')
    .isLength({ max: 100 }).withMessage('App name must be under 100 characters')
    .escape(),
  body('data_type')
    .trim()
    .notEmpty().withMessage('Data type is required')
    .isLength({ max: 100 }).withMessage('Data type must be under 100 characters')
    .escape(),
  body('purpose')
    .trim()
    .notEmpty().withMessage('Purpose is required')
    .isLength({ min: 5, max: 500 }).withMessage('Purpose must be 5–500 characters'),
  body('duration')
    .trim()
    .notEmpty().withMessage('Duration is required')
    .isLength({ max: 50 }).withMessage('Duration must be under 50 characters'),
];

// ── User ─────────────────────────────────────────────────────────────────────

exports.updateProfile = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
];

exports.updatePassword = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

exports.updateRole = [
  param('id').isInt({ min: 1 }).withMessage('Invalid user ID'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['admin', 'user']).withMessage('Role must be admin or user'),
];
