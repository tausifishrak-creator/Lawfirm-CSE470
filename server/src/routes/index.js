// All API routes, mounted under /api in app.js.
const express = require('express');

const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/admin', require('./adminRoutes'));
router.use('/schedule', require('./scheduleRoutes'));
router.use('/appointments', require('./appointmentRoutes'));
router.use('/', require('./caseRoutes'));
router.use('/tasks', require('./taskRoutes'));
router.use('/', require('./documentRoutes')); // /documents/..., /cases/:caseId/documents

module.exports = router;