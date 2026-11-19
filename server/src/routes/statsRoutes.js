const express = require('express');
const stats = require('../controllers/statsController');
const router = express.Router();


router.get('/', stats.publicStatistics);
module.exports = router;