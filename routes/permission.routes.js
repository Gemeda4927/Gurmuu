// routes/permission.routes.js
const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission.controller');
const { protect, requireRole } = require('../middleware/auth');
const { ROLES } = require('../constants/permissions.constants');

// Auth required for all routes
router.use(protect);

// ============ PUBLIC PERMISSION CHECKS ============
// Accessible to all authenticated users
router.get('/all', permissionController.getAllPermissions);
router.get('/check/:userId/:permission', permissionController.checkPermission);

// ============ USER-SPECIFIC PERMISSIONS ============
// Accessible to admin and superadmin
router.get('/user/:id', requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]), permissionController.getUserPermissions);
router.get('/user/:id/stats', requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]), permissionController.getUserPermissionStats);
router.get('/user/:id/audit', requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]), permissionController.getUserAuditLogs);

// ============ PERMISSION MANAGEMENT ============
// Admin and Superadmin only
router.use(requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]));

// Single permission operations
router.post('/user/:id/grant', permissionController.grantPermission);
router.post('/user/:id/revoke', permissionController.revokePermission);
router.post('/user/:id/reset', permissionController.resetPermissions);

// Bulk permission operations
router.post('/user/:id/bulk/grant', permissionController.bulkGrantPermissions);
router.post('/user/:id/bulk/revoke', permissionController.bulkRevokePermissions);

// ============ ROLE MANAGEMENT ============
// Admin and Superadmin only
router.post('/user/:id/role', permissionController.changeRole);
router.post('/user/:id/promote/admin', permissionController.promoteToAdmin);
router.post('/user/:id/demote/user', permissionController.demoteToUser);

// ============ SYSTEM-WIDE OPERATIONS ============
// Superadmin only routes
router.use(requireRole([ROLES.SUPERADMIN]));

// Audit logs
router.get('/audit/all', permissionController.getAllAuditLogs);

// System statistics
router.get('/stats/system', permissionController.getSystemPermissionStats);

// Role templates
router.get('/roles/templates', permissionController.getRoleTemplates);
router.put('/roles/templates/:role', permissionController.updateRoleTemplate);

module.exports = router;