const express = require('express');
const notifications = require('../controllers/notificationController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireRole('client', 'lawyer'));
router.get('/', notifications.list);
router.post('/read-all', notifications.markAllRead);
router.post('/:notificationId/read', notifications.markRead);

module.exports = router;
