const express = require('express');
const router = express.Router();
const sessionsController = require('../controllers/sessionsController');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, sessionsController.getSessions);
router.get('/new', requireLogin, sessionsController.getNewSession);
router.post('/', requireLogin, sessionsController.postCreateSession);
router.get('/:id', requireLogin, sessionsController.getSessionDetails);
router.post('/:id/join', requireLogin, sessionsController.postJoinSession);
router.post('/:id/cancel', requireLogin, sessionsController.postCancelSession);

module.exports = router;
