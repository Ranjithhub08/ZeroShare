const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/data.controller');
const protect = require('../middleware/auth.middleware');
router.use(protect);
router.get('/', ctrl.listData);
router.post('/', ctrl.addData);
router.delete('/:id', ctrl.deleteData);
module.exports = router;
