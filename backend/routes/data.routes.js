const express = require('express');
const router = express.Router();
const dataController = require('../controllers/data.controller');

router.get('/list', dataController.listData);

module.exports = router;
