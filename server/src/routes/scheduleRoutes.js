const express = require('express');
const schedule = require('../controllers/scheduleController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireRole('lawyer'));
router.get('/', schedule.getSchedule);
router.put('/', schedule.saveSchedule);
router.put('/dates/:date', schedule.setDateSlot);

module.exports = router;
