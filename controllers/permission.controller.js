// controllers/permission.controller.js
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { ROLES, PERMISSIONS, ROLE_PERMISSIONS } = require('../constants/permissions.constants');
const { body, validationResult } = require('express-validator');

// Validation
const validateGrantPermission = [
  body('permission').notEmpty().withMessage('Permission is required').isIn(Object.values(PERMISSIONS)).withMessage('Invalid permission'),
  body('reason').optional().trim()
];

const validateChangeRole = [
  body('role').notEmpty().withMessage('Role is required').isIn(Object.values(ROLES)).withMessage('Invalid role'),
  body('reason').optional().trim()
];

const validateBulkPermissions = [
  body('permissions').isArray().withMessage('Permissions must be an array').notEmpty().withMessage('Permissions array cannot be empty'),
  body('permissions.*').isIn(Object.values(PERMISSIONS)).withMessage('Invalid permission in array'),
  body('reason').optional().trim()
];

// Helper function to create audit log
const createAuditLog = async (user, targetUser, action, details, reason = '', req) => {
  try {
    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      targetUserId: targetUser?._id,
      targetUserName: targetUser?.name,
      action,
      details,
      reason,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};

// Grant permission
const grantPermission = [
  ...validateGrantPermission,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const { permission, reason } = req.body;
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

      // Authorization checks
      if (targetUser.role === ROLES.SUPERADMIN && req.user.role !== ROLES.SUPERADMIN)
        return res.status(403).json({ success: false, message: 'Cannot modify superadmin permissions' });
      
      if (targetUser._id.equals(req.user._id))
        return res.status(400).json({ success: false, message: 'Cannot modify your own permissions' });

      // Check if user already has permission
      if (targetUser.hasPermission(permission))
        return res.status(400).json({ success: false, message: 'User already has this permission' });

      const oldPermissions = [...targetUser.getPermissions()];
      targetUser.grantPermission(permission);
      await targetUser.save();

      // Create audit log
      await createAuditLog(
        req.user,
        targetUser,
        'GRANT_PERMISSION',
        `Granted permission: ${permission}`,
        reason,
        req
      );

      res.status(200).json({
        success: true,
        message: `Permission '${permission}' granted`,
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          permissions: targetUser.getPermissions()
        },
        oldPermissions,
        newPermissions: targetUser.getPermissions(),
        permission
      });
    } catch (err) {
      next(err);
    }
  }
];

// Revoke permission
const revokePermission = [
  ...validateGrantPermission,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const { permission, reason } = req.body;
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

      if (targetUser.role === ROLES.SUPERADMIN && req.user.role !== ROLES.SUPERADMIN)
        return res.status(403).json({ success: false, message: 'Cannot modify superadmin permissions' });
      
      if (targetUser._id.equals(req.user._id))
        return res.status(400).json({ success: false, message: 'Cannot modify your own permissions' });

      // Check if user has the permission
      if (!targetUser.hasPermission(permission))
        return res.status(400).json({ success: false, message: 'User does not have this permission' });

      const oldPermissions = [...targetUser.getPermissions()];
      targetUser.revokePermission(permission);
      await targetUser.save();

      // Create audit log
      await createAuditLog(
        req.user,
        targetUser,
        'REVOKE_PERMISSION',
        `Revoked permission: ${permission}`,
        reason,
        req
      );

      res.status(200).json({
        success: true,
        message: `Permission '${permission}' revoked`,
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          permissions: targetUser.getPermissions()
        },
        oldPermissions,
        newPermissions: targetUser.getPermissions(),
        permission
      });
    } catch (err) {
      next(err);
    }
  }
];

// Reset permissions
const resetPermissions = [
  body('reason').optional().trim(),
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
      
      if (targetUser.role === ROLES.SUPERADMIN && req.user.role !== ROLES.SUPERADMIN)
        return res.status(403).json({ success: false, message: 'Cannot reset superadmin permissions' });
      
      if (targetUser._id.equals(req.user._id))
        return res.status(400).json({ success: false, message: 'Cannot reset your own permissions' });

      const oldPermissions = [...targetUser.getPermissions()];
      const oldCustomPermissions = { ...targetUser.customPermissions };
      
      targetUser.customPermissions = { granted: [], revoked: [] };
      await targetUser.save();

      // Create audit log
      await createAuditLog(
        req.user,
        targetUser,
        'RESET_PERMISSIONS',
        `Reset all custom permissions. Previously had: ${oldCustomPermissions.granted.length} granted, ${oldCustomPermissions.revoked.length} revoked`,
        reason,
        req
      );

      res.status(200).json({
        success: true,
        message: 'All custom permissions reset successfully',
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          permissions: targetUser.getPermissions()
        },
        oldPermissions,
        newPermissions: targetUser.getPermissions(),
        resetPermissions: oldCustomPermissions.granted
      });
    } catch (err) {
      next(err);
    }
  }
];

// Change role
const changeRole = [
  ...validateChangeRole,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const { role, reason } = req.body;
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

      if (targetUser._id.equals(req.user._id))
        return res.status(400).json({ success: false, message: 'Cannot change your own role' });
      
      if ((role === ROLES.SUPERADMIN || targetUser.role === ROLES.SUPERADMIN) && req.user.role !== ROLES.SUPERADMIN)
        return res.status(403).json({ success: false, message: 'Only superadmin can manage superadmin roles' });

      const oldRole = targetUser.role;
      const oldPermissions = targetUser.getPermissions();
      
      targetUser.role = role;
      if (oldRole === ROLES.SUPERADMIN || role === ROLES.SUPERADMIN) {
        targetUser.customPermissions = { granted: [], revoked: [] };
      }
      targetUser.updatedBy = req.user._id;
      await targetUser.save();

      // Create audit log
      await createAuditLog(
        req.user,
        targetUser,
        'CHANGE_ROLE',
        `Changed role from ${oldRole} to ${role}`,
        reason,
        req
      );

      res.status(200).json({
        success: true,
        message: `Role changed from ${oldRole} to ${role}`,
        oldRole,
        newRole: role,
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          permissions: targetUser.getPermissions()
        },
        previousPermissions: oldPermissions,
        newPermissions: targetUser.getPermissions()
      });
    } catch (err) {
      next(err);
    }
  }
];

// Promote to admin
const promoteToAdmin = [
  body('reason').optional().trim(),
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

      if (targetUser.role === ROLES.SUPERADMIN)
        return res.status(400).json({ success: false, message: 'User is already a superadmin' });
      
      if (targetUser.role === ROLES.ADMIN)
        return res.status(400).json({ success: false, message: 'User is already an admin' });
      
      if (targetUser._id.equals(req.user._id))
        return res.status(400).json({ success: false, message: 'Cannot promote yourself' });

      const oldRole = targetUser.role;
      const oldPermissions = targetUser.getPermissions();
      
      targetUser.role = ROLES.ADMIN;
      targetUser.updatedBy = req.user._id;
      await targetUser.save();

      // Create audit log
      await createAuditLog(
        req.user,
        targetUser,
        'PROMOTE_TO_ADMIN',
        `Promoted user from ${oldRole} to admin`,
        reason,
        req
      );

      res.status(200).json({
        success: true,
        message: 'User promoted to admin successfully',
        oldRole,
        newRole: ROLES.ADMIN,
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          permissions: targetUser.getPermissions()
        },
        previousPermissions: oldPermissions,
        newPermissions: targetUser.getPermissions()
      });
    } catch (err) {
      next(err);
    }
  }
];

// Demote to user
const demoteToUser = [
  body('reason').optional().trim(),
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

      if (targetUser.role === ROLES.SUPERADMIN)
        return res.status(403).json({ success: false, message: 'Cannot demote a superadmin' });
      
      if (targetUser.role === ROLES.USER)
        return res.status(400).json({ success: false, message: 'User is already a regular user' });
      
      if (targetUser._id.equals(req.user._id))
        return res.status(400).json({ success: false, message: 'Cannot demote yourself' });

      const oldRole = targetUser.role;
      const oldPermissions = targetUser.getPermissions();
      const oldCustomPermissions = { ...targetUser.customPermissions };
      
      targetUser.role = ROLES.USER;
      targetUser.customPermissions = { granted: [], revoked: [] };
      targetUser.updatedBy = req.user._id;
      await targetUser.save();

      // Create audit log
      await createAuditLog(
        req.user,
        targetUser,
        'DEMOTE_TO_USER',
        `Demoted user from ${oldRole} to regular user. Reset ${oldCustomPermissions.granted.length} granted permissions.`,
        reason,
        req
      );

      res.status(200).json({
        success: true,
        message: 'User demoted to regular user successfully',
        oldRole,
        newRole: ROLES.USER,
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          permissions: targetUser.getPermissions()
        },
        previousPermissions: oldPermissions,
        newPermissions: targetUser.getPermissions(),
        resetPermissions: oldCustomPermissions.granted
      });
    } catch (err) {
      next(err);
    }
  }
];

// Bulk grant permissions
const bulkGrantPermissions = [
  ...validateBulkPermissions,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const { permissions, reason } = req.body;
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

      if (targetUser.role === ROLES.SUPERADMIN && req.user.role !== ROLES.SUPERADMIN)
        return res.status(403).json({ success: false, message: 'Cannot modify superadmin permissions' });
      
      if (targetUser._id.equals(req.user._id))
        return res.status(400).json({ success: false, message: 'Cannot modify your own permissions' });

      const oldPermissions = [...targetUser.getPermissions()];
      const granted = [];
      const alreadyHad = [];
      
      for (const permission of permissions) {
        if (!targetUser.hasPermission(permission)) {
          targetUser.grantPermission(permission);
          granted.push(permission);
        } else {
          alreadyHad.push(permission);
        }
      }
      
      await targetUser.save();

      // Create audit log
      await createAuditLog(
        req.user,
        targetUser,
        'BULK_GRANT_PERMISSIONS',
        `Bulk granted ${granted.length} permissions: ${granted.join(', ')}. ${alreadyHad.length} permissions already existed.`,
        reason,
        req
      );

      res.status(200).json({
        success: true,
        message: `Bulk permissions processed successfully`,
        granted,
        alreadyHad,
        totalProcessed: permissions.length,
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          permissions: targetUser.getPermissions()
        },
        oldPermissions,
        newPermissions: targetUser.getPermissions()
      });
    } catch (err) {
      next(err);
    }
  }
];

// Bulk revoke permissions
const bulkRevokePermissions = [
  ...validateBulkPermissions,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const { permissions, reason } = req.body;
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

      if (targetUser.role === ROLES.SUPERADMIN && req.user.role !== ROLES.SUPERADMIN)
        return res.status(403).json({ success: false, message: 'Cannot modify superadmin permissions' });
      
      if (targetUser._id.equals(req.user._id))
        return res.status(400).json({ success: false, message: 'Cannot modify your own permissions' });

      const oldPermissions = [...targetUser.getPermissions()];
      const revoked = [];
      const didntHave = [];
      
      for (const permission of permissions) {
        if (targetUser.hasPermission(permission)) {
          targetUser.revokePermission(permission);
          revoked.push(permission);
        } else {
          didntHave.push(permission);
        }
      }
      
      await targetUser.save();

      // Create audit log
      await createAuditLog(
        req.user,
        targetUser,
        'BULK_REVOKE_PERMISSIONS',
        `Bulk revoked ${revoked.length} permissions: ${revoked.join(', ')}. ${didntHave.length} permissions were not assigned.`,
        reason,
        req
      );

      res.status(200).json({
        success: true,
        message: `Bulk permissions revocation processed successfully`,
        revoked,
        didntHave,
        totalProcessed: permissions.length,
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          permissions: targetUser.getPermissions()
        },
        oldPermissions,
        newPermissions: targetUser.getPermissions()
      });
    } catch (err) {
      next(err);
    }
  }
];

// Get all permissions
const getAllPermissions = async (req, res, next) => {
  try {
    const allPermissions = Object.values(PERMISSIONS);
    
    // Categorize permissions
    const categories = {
      user_management: {
        name: 'User Management',
        permissions: [
          PERMISSIONS.MANAGE_USERS,
          PERMISSIONS.DEACTIVATE_USERS,
          PERMISSIONS.VIEW_ALL_USERS
        ],
        description: 'Manage users, roles, and access'
      },
      content_management: {
        name: 'Content Management',
        permissions: [
          PERMISSIONS.MANAGE_CONTENT,
          PERMISSIONS.CREATE_CONTENT,
          PERMISSIONS.EDIT_CONTENT,
          PERMISSIONS.DELETE_CONTENT,
          PERMISSIONS.PUBLISH_CONTENT
        ],
        description: 'Create, edit, and publish content'
      },
      settings: {
        name: 'System Settings',
        permissions: [
          PERMISSIONS.MANAGE_SETTINGS,
          PERMISSIONS.UPDATE_SYSTEM_SETTINGS,
          PERMISSIONS.VIEW_AUDIT_LOGS
        ],
        description: 'System configuration and settings'
      },
      roles_permissions: {
        name: 'Roles & Permissions',
        permissions: [
          PERMISSIONS.MANAGE_ROLES,
          PERMISSIONS.ASSIGN_PERMISSIONS
        ],
        description: 'Role and permission management'
      },
      analytics: {
        name: 'Analytics',
        permissions: [
          PERMISSIONS.VIEW_ANALYTICS,
          PERMISSIONS.EXPORT_DATA
        ],
        description: 'View and analyze data'
      },
      notifications: {
        name: 'Notifications',
        permissions: [
          PERMISSIONS.SEND_NOTIFICATIONS,
          PERMISSIONS.MANAGE_NOTIFICATIONS
        ],
        description: 'Send and manage notifications'
      }
    };

    // Role information with descriptions
    const roles = {
      [ROLES.USER]: {
        label: 'Regular User',
        description: 'Basic user with limited access',
        defaultPermissions: ROLE_PERMISSIONS[ROLES.USER]
      },
      [ROLES.ADMIN]: {
        label: 'Administrator',
        description: 'Full administrative access',
        defaultPermissions: ROLE_PERMISSIONS[ROLES.ADMIN]
      },
      [ROLES.SUPERADMIN]: {
        label: 'Super Administrator',
        description: 'Complete system access',
        defaultPermissions: ROLE_PERMISSIONS[ROLES.SUPERADMIN]
      }
    };

    res.status(200).json({
      success: true,
      permissions: PERMISSIONS,
      allPermissions,
      roles,
      categories,
      rolePermissions: ROLE_PERMISSIONS,
      metadata: {
        totalPermissions: allPermissions.length,
        totalCategories: Object.keys(categories).length,
        totalRoles: Object.keys(ROLES).length
      }
    });
  } catch (err) {
    next(err);
  }
};

// Check permission
const checkPermission = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
    
    const hasPermission = targetUser.hasPermission(req.params.permission);
    const userPermissions = targetUser.getPermissions();
    
    res.status(200).json({
      success: true,
      hasPermission,
      permission: req.params.permission,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        permissions: userPermissions,
        permissionCount: userPermissions.length
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get user permissions
const getUserPermissions = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
    
    const allPermissions = Object.values(PERMISSIONS);
    const userPermissions = targetUser.getPermissions();
    const availablePermissions = allPermissions.filter(p => !userPermissions.includes(p));
    
    // Categorize user's permissions
    const categorizedPermissions = {};
    const categories = {
      user_management: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.DEACTIVATE_USERS, PERMISSIONS.VIEW_ALL_USERS],
      content_management: [PERMISSIONS.MANAGE_CONTENT, PERMISSIONS.CREATE_CONTENT, PERMISSIONS.EDIT_CONTENT, PERMISSIONS.DELETE_CONTENT, PERMISSIONS.PUBLISH_CONTENT],
      settings: [PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.UPDATE_SYSTEM_SETTINGS, PERMISSIONS.VIEW_AUDIT_LOGS],
      roles_permissions: [PERMISSIONS.MANAGE_ROLES, PERMISSIONS.ASSIGN_PERMISSIONS],
      analytics: [PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.EXPORT_DATA],
      notifications: [PERMISSIONS.SEND_NOTIFICATIONS, PERMISSIONS.MANAGE_NOTIFICATIONS]
    };

    Object.keys(categories).forEach(category => {
      const categoryPerms = categories[category];
      const userCategoryPerms = userPermissions.filter(p => categoryPerms.includes(p));
      if (userCategoryPerms.length > 0) {
        categorizedPermissions[category] = userCategoryPerms;
      }
    });

    res.status(200).json({
      success: true,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive,
        permissions: userPermissions,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt
      },
      effectivePermissions: userPermissions,
      customPermissions: targetUser.customPermissions,
      availablePermissions,
      categorizedPermissions,
      statistics: {
        total: allPermissions.length,
        granted: userPermissions.length,
        available: availablePermissions.length,
        coverage: Math.round((userPermissions.length / allPermissions.length) * 100)
      },
      isSuperadmin: targetUser.role === ROLES.SUPERADMIN
    });
  } catch (err) {
    next(err);
  }
};

// Get user audit logs
const getUserAuditLogs = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await AuditLog.find({ targetUserId: targetUser._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AuditLog.countDocuments({ targetUserId: targetUser._id });

    res.status(200).json({
      success: true,
      logs,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get all audit logs
const getAllAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, action, userId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = {};
    if (action) query.action = action;
    if (userId) query.userId = userId;
    
    // Date range filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await AuditLog.countDocuments(query);
    
    res.status(200).json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get user permission statistics
const getUserPermissionStats = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const allPermissions = Object.values(PERMISSIONS);
    const userPermissions = targetUser.getPermissions();
    
    const stats = {
      total: allPermissions.length,
      granted: userPermissions.length,
      available: allPermissions.length - userPermissions.length,
      coverage: Math.round((userPermissions.length / allPermissions.length) * 100),
      byCategory: {}
    };

    // Categorize permissions
    const categories = {
      user_management: {
        name: 'User Management',
        permissions: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.DEACTIVATE_USERS, PERMISSIONS.VIEW_ALL_USERS]
      },
      content_management: {
        name: 'Content Management',
        permissions: [PERMISSIONS.MANAGE_CONTENT, PERMISSIONS.CREATE_CONTENT, PERMISSIONS.EDIT_CONTENT, PERMISSIONS.DELETE_CONTENT, PERMISSIONS.PUBLISH_CONTENT]
      },
      settings: {
        name: 'System Settings',
        permissions: [PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.UPDATE_SYSTEM_SETTINGS, PERMISSIONS.VIEW_AUDIT_LOGS]
      },
      roles_permissions: {
        name: 'Roles & Permissions',
        permissions: [PERMISSIONS.MANAGE_ROLES, PERMISSIONS.ASSIGN_PERMISSIONS]
      },
      analytics: {
        name: 'Analytics',
        permissions: [PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.EXPORT_DATA]
      },
      notifications: {
        name: 'Notifications',
        permissions: [PERMISSIONS.SEND_NOTIFICATIONS, PERMISSIONS.MANAGE_NOTIFICATIONS]
      }
    };

    Object.keys(categories).forEach(category => {
      const categoryPerms = categories[category].permissions;
      const granted = categoryPerms.filter(p => userPermissions.includes(p));
      stats.byCategory[category] = {
        name: categories[category].name,
        total: categoryPerms.length,
        granted: granted.length,
        coverage: Math.round((granted.length / categoryPerms.length) * 100),
        permissions: granted
      };
    });

    res.status(200).json({
      success: true,
      stats,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        role: targetUser.role
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get system permission statistics
const getSystemPermissionStats = async (req, res, next) => {
  try {
    const users = await User.find({}).select('role customPermissions');
    const allPermissions = Object.values(PERMISSIONS);
    
    const stats = {
      totalUsers: users.length,
      byRole: {},
      permissionUsage: {},
      averagePermissions: 0
    };

    // Count users by role
    users.forEach(user => {
      const role = user.role;
      if (!stats.byRole[role]) {
        stats.byRole[role] = { count: 0, totalPermissions: 0, users: [] };
      }
      stats.byRole[role].count++;
      const userPerms = user.getPermissions();
      stats.byRole[role].totalPermissions += userPerms.length;
      stats.byRole[role].users.push({
        _id: user._id,
        name: user.name,
        permissionCount: userPerms.length
      });
    });

    // Calculate average permissions for each role
    Object.keys(stats.byRole).forEach(role => {
      if (stats.byRole[role].count > 0) {
        stats.byRole[role].averagePermissions = Math.round(
          stats.byRole[role].totalPermissions / stats.byRole[role].count
        );
      }
    });

    // Calculate permission usage across all users
    allPermissions.forEach(permission => {
      let count = 0;
      users.forEach(user => {
        if (user.hasPermission(permission)) {
          count++;
        }
      });
      stats.permissionUsage[permission] = {
        count,
        percentage: users.length > 0 ? Math.round((count / users.length) * 100) : 0
      };
    });

    // Calculate overall average permissions per user
    const totalPermissions = users.reduce((sum, user) => {
      return sum + user.getPermissions().length;
    }, 0);
    stats.averagePermissions = users.length > 0 ? Math.round(totalPermissions / users.length) : 0;

    res.status(200).json({
      success: true,
      stats,
      totalPermissions: allPermissions.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

// Get role templates
const getRoleTemplates = async (req, res, next) => {
  try {
    const templates = {
      [ROLES.USER]: {
        name: 'Regular User',
        description: 'Basic access with limited permissions',
        defaultPermissions: ROLE_PERMISSIONS[ROLES.USER],
        customizable: true,
        canManage: ['admin', 'superadmin']
      },
      [ROLES.ADMIN]: {
        name: 'Administrator',
        description: 'Full administrative access',
        defaultPermissions: ROLE_PERMISSIONS[ROLES.ADMIN],
        customizable: true,
        canManage: ['superadmin']
      },
      [ROLES.SUPERADMIN]: {
        name: 'Super Administrator',
        description: 'Complete system access',
        defaultPermissions: ROLE_PERMISSIONS[ROLES.SUPERADMIN],
        customizable: false,
        canManage: []
      }
    };

    res.status(200).json({
      success: true,
      templates,
      metadata: {
        totalTemplates: Object.keys(templates).length,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
};

// Update role template
const updateRoleTemplate = [
  body('defaultPermissions').isArray().withMessage('Default permissions must be an array'),
  body('defaultPermissions.*').isIn(Object.values(PERMISSIONS)).withMessage('Invalid permission in array'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const { defaultPermissions } = req.body;
      const { role } = req.params;
      
      if (!Object.values(ROLES).includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }

      if (role === ROLES.SUPERADMIN) {
        return res.status(403).json({ 
          success: false, 
          message: 'Cannot modify superadmin template' 
        });
      }

      // In a real application, you would save this to a database
      // For now, we'll update the ROLE_PERMISSIONS constant
      ROLE_PERMISSIONS[role] = defaultPermissions;

      // Create audit log
      await createAuditLog(
        req.user,
        null,
        'UPDATE_ROLE_TEMPLATE',
        `Updated ${role} template with ${defaultPermissions.length} permissions`,
        req.body.reason || '',
        req
      );

      res.status(200).json({
        success: true,
        message: 'Role template updated successfully',
        template: {
          role,
          defaultPermissions,
          totalPermissions: defaultPermissions.length
        }
      });
    } catch (err) {
      next(err);
    }
  }
];

module.exports = {
  grantPermission,
  revokePermission,
  resetPermissions,
  changeRole,
  promoteToAdmin,
  demoteToUser,
  bulkGrantPermissions,
  bulkRevokePermissions,
  getAllPermissions,
  checkPermission,
  getUserPermissions,
  getUserAuditLogs,
  getAllAuditLogs,
  getUserPermissionStats,
  getSystemPermissionStats,
  getRoleTemplates,
  updateRoleTemplate
};