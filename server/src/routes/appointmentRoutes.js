const express = require('express');
const appointments = require('../controllers/appointmentController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireRole('client', 'lawyer'), appointments.list);
router.get('/calendar', requireRole('client', 'lawyer'), appointments.calendar);
router.get('/slots', requireRole('client', 'lawyer'), appointments.slots);
router.post('/', requireRole('client', 'lawyer'), appointments.create);
router.patch('/:appointmentId', requireRole('lawyer'), appointments.updateStatus);
router.patch('/:appointmentId/reschedule', requireRole('lawyer'), appointments.reschedule);

module.exports = router;
