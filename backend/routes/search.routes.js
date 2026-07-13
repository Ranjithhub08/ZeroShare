const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/search.controller');
const protect = require('../middleware/auth.middleware');
router.use(protect);
router.get('/', ctrl.search);
module.exports = router;
