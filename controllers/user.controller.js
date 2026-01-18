const User = require('../models/User');
const { ROLES, PERMISSIONS } = require('../constants/permissions.constants');
const { body, validationResult } = require('express-validator');

// Validation rules
const validateUpdateProfile = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('bio').optional().trim().isLength({ max: 250 }),
  body('social.facebook').optional().trim(),
  body('social.twitter').optional().trim(),
  body('social.linkedin').optional().trim(),
  body('social.instagram').optional().trim(),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.zip').optional().trim(),
  body('address.country').optional().trim(),
];

// Get user profile
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
const updateProfile = [
  ...validateUpdateProfile,
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

      // Check if email is being changed
      if (req.body.email && req.body.email !== req.user.email) {
        const existingUser = await User.findOne({ 
          email: req.body.email,
          _id: { $ne: req.user._id }
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use'
          });
        }
      }

      const user = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      next(error);
    }
  }
];

// Change password validation
const validateChangePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
];

// Change password
const changePassword = [
  ...validateChangePassword,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user._id).select('+password');

      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      user.password = newPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
];

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};