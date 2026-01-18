const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/signup', authController.signup);  
router.post('/login', authController.login);

// Protected routes
router.get('/me', protect, authController.getMe);
router.put('/me', protect, authController.updateMe);  
router.post('/logout', protect, authController.logout);

module.exports = router;