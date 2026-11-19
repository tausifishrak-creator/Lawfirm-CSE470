const express = require('express');
const stats = require('../controllers/statsController');
const router = express.Router();

router.get('public', stats.publicStats);
module.exports = router;