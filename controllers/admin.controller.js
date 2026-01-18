const User = require('../models/User');
const { ROLES, PERMISSIONS } = require('../constants/permissions.constants');
const { body, validationResult } = require('express-validator');

// Get all users (Admin/Superadmin)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-__v');
    
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID (Admin/Superadmin)
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// Create user (Admin/Superadmin)
const createUser = [
  body('name').trim().notEmpty().isLength({ min: 2, max: 50 }),
  body('email').trim().notEmpty().isEmail().normalizeEmail(),
  body('password').notEmpty().isLength({ min: 6 }),
  body('role').optional().isIn(Object.values(ROLES)),
  
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { name, email, password, role = ROLES.USER } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Check if admin can assign this role
      if (req.user.role === ROLES.ADMIN && role === ROLES.SUPERADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Admin cannot create superadmin users'
        });
      }

      const user = await User.create({
        name,
        email,
        password,
        role,
        createdBy: req.user._id
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user
      });
    } catch (error) {
      next(error);
    }
  }
];

// Update user (Admin/Superadmin)
const updateUser = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('role').optional().isIn(Object.values(ROLES)),
  body('isActive').optional().isBoolean(),
  
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const updateData = { ...req.body };

      // Check role change restrictions
      if (req.body.role) {
        if (req.user.role === ROLES.ADMIN && req.body.role === ROLES.SUPERADMIN) {
          return res.status(403).json({
            success: false,
            message: 'Admin cannot assign superadmin role'
          });
        }
      }

      // Check if email is being changed
      if (req.body.email) {
        const existingUser = await User.findOne({ 
          email: req.body.email,
          _id: { $ne: req.params.id }
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use'
          });
        }
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { ...updateData, updatedBy: req.user._id },
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        user
      });
    } catch (error) {
      next(error);
    }
  }
];

// Deactivate user (Admin/Superadmin)
const deactivateUser = async (req, res, next) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: req.user._id },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

// Activate user (Admin/Superadmin)
const activateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true, updatedBy: req.user._id },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User activated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

// Delete user (Superadmin only)
const deleteUser = async (req, res, next) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get user permissions
const getUserPermissions = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      permissions: user.getPermissions(),
      role: user.role,
      customPermissions: user.customPermissions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
  getUserPermissions
};