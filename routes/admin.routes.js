const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, requirePermission, canManageUser } = require('../middleware/auth');

// All admin routes require authentication
router.use(protect);

// Get all users (admin+ only)
router.get('/users', (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}, adminController.getAllUsers);

// Get specific user
router.get('/users/:id', (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}, adminController.getUserById);

// Create new user
router.post('/users', (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}, adminController.createUser);

// Update user
router.put('/users/:id', (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}, adminController.updateUser);

// Deactivate user
router.put('/users/:id/deactivate', (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}, adminController.deactivateUser);

// Activate user
router.put('/users/:id/activate', (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}, adminController.activateUser);

// Delete user (Superadmin only)
router.delete('/users/:id', (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Superadmin access required'
    });
  }
  next();
}, adminController.deleteUser);

// Get user permissions
router.get('/users/:id/permissions', (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}, adminController.getUserPermissions);

module.exports = router;