
const express = require('express');
const tasks = require('../controllers/taskController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireRole('lawyer'));

router.get('/', tasks.list);
router.post('/', tasks.create);
router.patch('/:taskId/status', tasks.updateStatus);
router.delete('/:taskId', tasks.remove);

module.exports = router;