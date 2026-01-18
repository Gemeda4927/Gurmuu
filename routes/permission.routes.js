const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission.controller');
const { protect, requireRole } = require('../middleware/auth');
const { ROLES } = require('../constants/permissions.constants');

// All routes require authentication
router.use(protect);

// Public permission routes (authenticated users can check)
router.get('/all', permissionController.getAllPermissions);
router.get('/check/:userId/:permission', permissionController.checkPermission);

// Get specific user permissions (requires authentication)
router.get('/user/:id', permissionController.getUserPermissions);

// Superadmin only routes
router.use(requireRole([ROLES.SUPERADMIN]));

// Permission management
router.post('/user/:id/grant', permissionController.grantPermission);
router.post('/user/:id/revoke', permissionController.revokePermission);
router.post('/user/:id/reset', permissionController.resetPermissions);

// Role management
router.put('/user/:id/role', permissionController.changeRole);
router.post('/user/:id/promote/admin', permissionController.promoteToAdmin);
router.post('/user/:id/demote/user', permissionController.demoteToUser);

module.exports = router;