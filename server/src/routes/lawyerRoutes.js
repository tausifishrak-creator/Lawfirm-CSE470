const express = require('express');
const lawyers = require('../controllers/lawyerController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireRole('client'), lawyers.search);
router.get('/:lawyerId', requireRole('client'), lawyers.show);

module.exports = router;
