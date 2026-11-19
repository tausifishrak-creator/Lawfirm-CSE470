
const express = require('express');
const cases = require('../controllers/caseController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/cases', requireRole('client', 'lawyer'), cases.list);
router.post('/cases', requireRole('client'), cases.create);
router.patch('/cases/:caseId/respond', requireRole('lawyer'), cases.respond);
router.patch('/cases/:caseId/status', requireRole('lawyer'), cases.updateStatus);

router.patch(
    '/cases/:caseId/details',
    requireRole('lawyer'),
    cases.updateDetails
);

module.exports = router;