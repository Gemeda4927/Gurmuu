// utils/jwt.js - UPDATED VERSION
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'gurmuu-backend-fallback-secret-2024';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  
  return jwt.sign({ id }, secret, {
    expiresIn: expiresIn,
  });
};

// Alias for compatibility with your auth.controller.js
const signToken = generateToken;

const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET || 'gurmuu-backend-fallback-secret-2024';
    return jwt.verify(token, secret);
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return null;
  }
};

module.exports = {
  generateToken,
  signToken,      // Added for compatibility
  verifyToken
};