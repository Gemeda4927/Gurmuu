const User = require('../models/User');
const jwt = require('jsonwebtoken');

/* =========================
   Helper: Generate JWT Token
========================= */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

/* =========================
   Helper: Send Token Response
========================= */
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user,
  });
};

/* =========================
   @desc    Signup User (user, admin, superadmin)
   @route   POST /api/auth/signup
   @access  Public (or admin for admin/superadmin)
========================= */
exports.signup = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      avatar,
      bio,
      social,
      address,
      role, // <--- capture role from request
    } = req.body;

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use',
      });
    }

    // Only allow valid roles
    const validRoles = ['user', 'admin', 'superadmin'];
    const userRole = validRoles.includes(role) ? role : 'user';

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      avatar,
      bio,
      social,
      address,
      role: userRole,
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

/* =========================
   @desc    Login User
   @route   POST /api/auth/login
   @access  Public
========================= */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/* =========================
   @desc    Get Current User
   @route   GET /api/auth/me
   @access  Private
========================= */
exports.getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================
   @desc    Update Current User
   @route   PUT /api/auth/me
   @access  Private
========================= */
exports.updateMe = async (req, res, next) => {
  try {
    // Prevent password updates here
    if (req.body.password) {
      return res.status(400).json({
        success: false,
        message: 'Password updates are not allowed here',
      });
    }

    const allowedFields = [
      'name',
      'email',
      'phone',
      'avatar',
      'bio',
      'social',
      'address',
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
