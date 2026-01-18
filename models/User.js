const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, PERMISSIONS, ROLE_PERMISSIONS } = require('../constants/permissions.constants');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  phone: { type: String, trim: true, default: '' },
  avatar: { type: String, default: '' },
  bio: { type: String, trim: true, maxlength: 250, default: '' },
  social: {
    facebook: { type: String, trim: true },
    twitter: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    instagram: { type: String, trim: true },
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.USER,
  },
  customPermissions: {
    granted: [{ type: String, enum: Object.values(PERMISSIONS) }],
    revoked: [{ type: String, enum: Object.values(PERMISSIONS) }],
  },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Get user's effective permissions
userSchema.methods.getPermissions = function() {
  if (this.role === ROLES.SUPERADMIN) {
    return Object.values(PERMISSIONS);
  }
  
  const defaultPermissions = [...ROLE_PERMISSIONS[this.role] || []];
  const granted = this.customPermissions?.granted || [];
  const revoked = this.customPermissions?.revoked || [];
  
  const allPermissions = [...defaultPermissions, ...granted];
  const effectivePermissions = allPermissions.filter(
    permission => !revoked.includes(permission)
  );
  
  return [...new Set(effectivePermissions)];
};

// Check if user has specific permission
userSchema.methods.hasPermission = function(permission) {
  return this.getPermissions().includes(permission);
};

// Check if user has any of the given permissions
userSchema.methods.hasAnyPermission = function(permissionsArray) {
  const userPermissions = this.getPermissions();
  return permissionsArray.some(permission => 
    userPermissions.includes(permission)
  );
};

// Check if user can manage another user
userSchema.methods.canManageUser = function(targetUser) {
  if (this.role === ROLES.USER) return this._id.equals(targetUser._id);
  if (this.role === ROLES.ADMIN) return targetUser.role !== ROLES.SUPERADMIN;
  if (this.role === ROLES.SUPERADMIN) return true;
  return false;
};

// Grant permission to user
userSchema.methods.grantPermission = function(permission, grantedBy, reason = '') {
  if (!Object.values(PERMISSIONS).includes(permission)) {
    throw new Error('Invalid permission');
  }
  
  if (!this.customPermissions) {
    this.customPermissions = { granted: [], revoked: [] };
  }
  
  // Remove from revoked if it was previously revoked
  const revokedIndex = this.customPermissions.revoked.indexOf(permission);
  if (revokedIndex > -1) {
    this.customPermissions.revoked.splice(revokedIndex, 1);
  }
  
  // Add to granted if not already there
  if (!this.customPermissions.granted.includes(permission)) {
    this.customPermissions.granted.push(permission);
  }
};

// Revoke permission from user
userSchema.methods.revokePermission = function(permission, revokedBy, reason = '') {
  if (!Object.values(PERMISSIONS).includes(permission)) {
    throw new Error('Invalid permission');
  }
  
  if (!this.customPermissions) {
    this.customPermissions = { granted: [], revoked: [] };
  }
  
  // Remove from granted if it was previously granted
  const grantedIndex = this.customPermissions.granted.indexOf(permission);
  if (grantedIndex > -1) {
    this.customPermissions.granted.splice(grantedIndex, 1);
  }
  
  // Add to revoked if not already there
  if (!this.customPermissions.revoked.includes(permission)) {
    this.customPermissions.revoked.push(permission);
  }
};

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  delete obj.customPermissions;
  obj.permissions = this.getPermissions();
  return obj;
};

// Attach constants to schema for easy access
userSchema.statics.ROLES = ROLES;
userSchema.statics.PERMISSIONS = PERMISSIONS;
userSchema.statics.ROLE_PERMISSIONS = ROLE_PERMISSIONS;

const User = mongoose.model('User', userSchema);

module.exports = User;