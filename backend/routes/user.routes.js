const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/user.controller');
const protect = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/admin.middleware');
const v = require('../middleware/validators');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');

router.use(protect);
router.get('/profile',          ctrl.getProfile);
router.get('/privacy-report',   ctrl.downloadPrivacyReport);
router.get('/export',           ctrl.exportData);
router.put('/profile',          v.updateProfile,  validate, ctrl.updateProfile);
router.put('/password',         v.updatePassword, validate, ctrl.updatePassword);
router.post('/avatar',          upload.single('avatar'), ctrl.uploadAvatar);
router.delete('/avatar',        ctrl.removeAvatar);
router.delete('/me',            ctrl.deleteMyAccount);
router.get('/all',              adminOnly, ctrl.getAllUsers);
router.get('/:id/records',      adminOnly, ctrl.getUserRecords);
router.put('/:id/role',         adminOnly, v.updateRole, validate, ctrl.updateUserRole);
router.put('/:id/suspend',      adminOnly, ctrl.suspendUser);
router.put('/:id/unsuspend',    adminOnly, ctrl.unsuspendUser);
router.delete('/:id',           adminOnly, ctrl.deleteUser);

module.exports = router;
