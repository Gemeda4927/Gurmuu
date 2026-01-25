const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission.controller');
const { protect, requireRole } = require('../middleware/auth');
const { ROLES } = require('../constants/permissions.constants');

// Auth required
router.use(protect);

// Public permission checks
router.get('/all', permissionController.getAllPermissions);
router.get('/check/:userId/:permission', permissionController.checkPermission);

// Specific user permissions
router.get('/user/:id', permissionController.getUserPermissions);

// Superadmin only
router.use(requireRole([ROLES.SUPERADMIN]));

// Permission management
router.post('/user/:id/grant', permissionController.grantPermission);
router.post('/user/:id/revoke', permissionController.revokePermission);
router.post('/user/:id/reset', permissionController.resetPermissions);

// Role management
router.put('/user/:id/role', permissionController.changeRole);

module.exports = router;
