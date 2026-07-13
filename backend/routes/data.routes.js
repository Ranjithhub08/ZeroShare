const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/data.controller');
const protect = require('../middleware/auth.middleware');
const uploadData = require('../middleware/uploadData');

router.use(protect);
router.get('/export',           ctrl.exportData);
router.get('/',                 ctrl.listData);
router.post('/',                ctrl.addData);
router.post('/upload',          uploadData.single('file'), ctrl.uploadFile);
router.get('/:id/download',     ctrl.downloadFile);
router.delete('/:id',           ctrl.deleteData);
module.exports = router;
