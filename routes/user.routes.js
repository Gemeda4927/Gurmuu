const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);

// Admin routes
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id/deactivate', userController.deactivateUser);
router.put('/:id/activate', userController.activateUser);

module.exports = router;