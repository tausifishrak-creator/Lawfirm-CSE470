const express = require('express');
const dashboard = require('../controllers/dashboardController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/client', requireRole('client'), dashboard.clientDashboard);
router.get('/lawyer', requireRole('lawyer'), dashboard.lawyerDashboard);
router.get('/admin', requireRole('admin'), dashboard.adminDashboard);

module.exports = router;
