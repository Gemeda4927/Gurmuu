const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/updateProfile', userController.updateProfile);
router.put('/change-password', userController.changePassword);

module.exports = router;