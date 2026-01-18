const User = require('../models/User');
const { ROLES, PERMISSIONS } = require('../constants/permissions.constants');
const { body, validationResult } = require('express-validator');

// Grant permission validation
const validateGrantPermission = [
  body('permission')
    .notEmpty().withMessage('Permission is required')
    .isIn(Object.values(PERMISSIONS)).withMessage('Invalid permission'),
  body('reason').optional().trim(),
];

// Change role validation
const validateChangeRole = [
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(Object.values(ROLES)).withMessage('Invalid role'),
  body('reason').optional().trim(),
];

// Grant permission to user (Superadmin only - can grant to users AND admins)
const grantPermission = [
  ...validateGrantPermission,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { permission, reason } = req.body;
      const targetUser = await User.findById(req.params.id);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Superadmin can grant permissions to anyone (users AND admins)
      // Only restriction: Cannot modify another superadmin's permissions
      if (targetUser.role === ROLES.SUPERADMIN && req.user.role !== ROLES.SUPERADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify superadmin permissions'
        });
      }

      // Superadmin cannot grant permission to themselves (should have all permissions anyway)
      if (targetUser._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify your own permissions'
        });
      }

      targetUser.grantPermission(permission, req.user._id, reason);
      await targetUser.save();

      res.status(200).json({
        success: true,
        message: `Permission '${permission}' granted successfully to ${targetUser.role}`,
        user: targetUser
      });
    } catch (error) {
      next(error);
    }
  }
];

// Revoke permission from user (Superadmin only - can revoke from users AND admins)
const revokePermission = [
  ...validateGrantPermission,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { permission, reason } = req.body;
      const targetUser = await User.findById(req.params.id);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Superadmin can revoke permissions from anyone (users AND admins)
      // Only restriction: Cannot modify another superadmin's permissions
      if (targetUser.role === ROLES.SUPERADMIN && req.user.role !== ROLES.SUPERADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify superadmin permissions'
        });
      }

      // Superadmin cannot revoke permission from themselves
      if (targetUser._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify your own permissions'
        });
      }

      targetUser.revokePermission(permission, req.user._id, reason);
      await targetUser.save();

      res.status(200).json({
        success: true,
        message: `Permission '${permission}' revoked successfully from ${targetUser.role}`,
        user: targetUser
      });
    } catch (error) {
      next(error);
    }
  }
];

// Reset all permissions (Superadmin only - can reset for users AND admins)
const resetPermissions = [
  body('reason').optional().trim(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { reason } = req.body;
      const targetUser = await User.findById(req.params.id);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Only superadmin can reset superadmin permissions
      if (targetUser.role === ROLES.SUPERADMIN && req.user.role !== ROLES.SUPERADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Cannot reset superadmin permissions'
        });
      }

      // Superadmin cannot reset their own permissions
      if (targetUser._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot reset your own permissions'
        });
      }

      targetUser.customPermissions = { granted: [], revoked: [] };
      await targetUser.save();

      res.status(200).json({
        success: true,
        message: `All permissions reset successfully for ${targetUser.role}`,
        user: targetUser
      });
    } catch (error) {
      next(error);
    }
  }
];

// Change user role (Superadmin only - can promote/demote users AND admins)
const changeRole = [
  ...validateChangeRole,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { role, reason } = req.body;
      const targetUser = await User.findById(req.params.id);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Cannot change your own role
      if (targetUser._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change your own role'
        });
      }

      // Only superadmin can assign superadmin role or demote superadmin
      if (role === ROLES.SUPERADMIN || targetUser.role === ROLES.SUPERADMIN) {
        if (req.user.role !== ROLES.SUPERADMIN) {
          return res.status(403).json({
            success: false,
            message: 'Only superadmin can manage superadmin roles'
          });
        }
      }

      // Prevent creating multiple superadmins (optional security measure)
      if (role === ROLES.SUPERADMIN) {
        const superadminCount = await User.countDocuments({ role: ROLES.SUPERADMIN });
        if (superadminCount >= 3) { // Limit to 3 superadmins max
          return res.status(400).json({
            success: false,
            message: 'Maximum superadmin limit reached (3)'
          });
        }
      }

      // Update role
      const oldRole = targetUser.role;
      targetUser.role = role;
      
      // When changing to/from superadmin, reset custom permissions
      if (oldRole === ROLES.SUPERADMIN || role === ROLES.SUPERADMIN) {
        targetUser.customPermissions = { granted: [], revoked: [] };
      }

      // Track role change
      targetUser.updatedBy = req.user._id;
      await targetUser.save();

      res.status(200).json({
        success: true,
        message: `User role changed from ${oldRole} to ${role}`,
        oldRole,
        newRole: role,
        user: targetUser
      });
    } catch (error) {
      next(error);
    }
  }
];

// Promote user to admin (Superadmin only)
const promoteToAdmin = [
  body('reason').optional().trim(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { reason } = req.body;
      const targetUser = await User.findById(req.params.id);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (targetUser.role === ROLES.ADMIN) {
        return res.status(400).json({
          success: false,
          message: 'User is already an admin'
        });
      }

      if (targetUser.role === ROLES.SUPERADMIN) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote superadmin using this endpoint'
        });
      }

      // Cannot promote yourself
      if (targetUser._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot promote yourself'
        });
      }

      const oldRole = targetUser.role;
      targetUser.role = ROLES.ADMIN;
      targetUser.updatedBy = req.user._id;
      await targetUser.save();

      res.status(200).json({
        success: true,
        message: `User promoted from ${oldRole} to admin`,
        oldRole,
        newRole: ROLES.ADMIN,
        user: targetUser
      });
    } catch (error) {
      next(error);
    }
  }
];

// Demote admin to user (Superadmin only)
const demoteToUser = [
  body('reason').optional().trim(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { reason } = req.body;
      const targetUser = await User.findById(req.params.id);

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (targetUser.role === ROLES.USER) {
        return res.status(400).json({
          success: false,
          message: 'User is already a regular user'
        });
      }

      if (targetUser.role === ROLES.SUPERADMIN) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote superadmin using this endpoint'
        });
      }

      // Cannot demote yourself
      if (targetUser._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote yourself'
        });
      }

      const oldRole = targetUser.role;
      targetUser.role = ROLES.USER;
      targetUser.customPermissions = { granted: [], revoked: [] }; // Reset permissions when demoted
      targetUser.updatedBy = req.user._id;
      await targetUser.save();

      res.status(200).json({
        success: true,
        message: `User demoted from ${oldRole} to regular user`,
        oldRole,
        newRole: ROLES.USER,
        user: targetUser
      });
    } catch (error) {
      next(error);
    }
  }
];

// Get all available permissions
const getAllPermissions = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      permissions: PERMISSIONS,
      roles: ROLES,
      rolePermissions: {
        [ROLES.USER]: 'No default permissions',
        [ROLES.ADMIN]: 'Default admin permissions',
        [ROLES.SUPERADMIN]: 'All permissions'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Check if user has permission
const checkPermission = async (req, res, next) => {
  try {
    const { permission } = req.params;
    const targetUser = await User.findById(req.params.userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const hasPermission = targetUser.hasPermission(permission);

    res.status(200).json({
      success: true,
      hasPermission,
      permission,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        permissions: targetUser.getPermissions()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user's effective permissions
const getUserPermissions = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      },
      effectivePermissions: targetUser.getPermissions(),
      customPermissions: targetUser.customPermissions,
      isSuperadmin: targetUser.role === ROLES.SUPERADMIN,
      canBeManagedBySuperadmin: targetUser.role !== ROLES.SUPERADMIN || 
        (targetUser.role === ROLES.SUPERADMIN && req.user._id.toString() === targetUser._id.toString())
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  grantPermission,
  revokePermission,
  resetPermissions,
  changeRole,
  promoteToAdmin,
  demoteToUser,
  getAllPermissions,
  checkPermission,
  getUserPermissions
};