const express = require('express');
const router = express.Router();
const sportsController = require('../controllers/sportsController');
const { requireAdmin } = require('../middleware/auth');

router.get('/', requireAdmin, sportsController.getSports);
router.post('/', requireAdmin, sportsController.createSport);
router.get('/:id/edit', requireAdmin, sportsController.getEditSport);
router.post('/:id/edit', requireAdmin, sportsController.updateSport);

module.exports = router;
