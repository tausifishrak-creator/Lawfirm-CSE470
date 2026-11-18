
const express = require('express');
const cases = require('../controllers/caseController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.patch(
    '/cases/:caseId/details',
    requireRole('lawyer'),
    cases.updateDetails
);

module.exports = router;