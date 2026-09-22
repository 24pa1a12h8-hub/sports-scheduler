const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const dashboardController = require('../controllers/dashboardController');
const { requireAdmin } = require('../middleware/auth');

router.get('/dashboard', requireAdmin, dashboardController.getAdminDashboard);
router.get('/reports', requireAdmin, reportsController.getReports);

module.exports = router;
