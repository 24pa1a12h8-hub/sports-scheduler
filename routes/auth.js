const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireLogin, forwardAuthenticated } = require('../middleware/auth');

router.get('/signup', forwardAuthenticated, authController.getSignup);
router.post('/signup', forwardAuthenticated, authController.postSignup);

router.get('/login', forwardAuthenticated, authController.getLogin);
router.post('/login', forwardAuthenticated, authController.postLogin);

router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

router.get('/change-password', requireLogin, authController.getChangePassword);
router.post('/change-password', requireLogin, authController.postChangePassword);

module.exports = router;
