const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, PERMISSIONS, ROLE_PERMISSIONS } = require('../constants/permissions.constants');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/ },
  password: { type: String, required: true, minlength: 6, select: false },
  phone: { type: String, trim: true, default: '' },
  avatar: { type: String, default: '' },
  bio: { type: String, trim: true, maxlength: 250, default: '' },
  social: { facebook: String, twitter: String, linkedin: String, instagram: String },
  address: { street: String, city: String, state: String, zip: String, country: String },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
  customPermissions: { granted: [{ type: String, enum: Object.values(PERMISSIONS) }], revoked: [{ type: String, enum: Object.values(PERMISSIONS) }] },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Permissions

userSchema.methods.getPermissions = function() {
  if (this.role === ROLES.SUPERADMIN) return Object.values(PERMISSIONS);

  const defaultPermissions = [...ROLE_PERMISSIONS[this.role] || []];

  // Ensure VIEW_CONTENT is always included
  if (!defaultPermissions.includes(PERMISSIONS.VIEW_CONTENT)) {
    defaultPermissions.push(PERMISSIONS.VIEW_CONTENT);
  }

  const granted = this.customPermissions?.granted || [];
  const revoked = this.customPermissions?.revoked || [];

  const effectivePermissions = [...defaultPermissions, ...granted].filter(p => p && !revoked.includes(p));

  return [...new Set(effectivePermissions)];
};



userSchema.methods.hasPermission = function(permission) {
  return this.getPermissions().includes(permission);
};

userSchema.methods.hasAnyPermission = function(permissionsArray) {
  return permissionsArray.some(p => this.getPermissions().includes(p));
};

// Manage other users
userSchema.methods.canManageUser = function(targetUser) {
  if (this.role === ROLES.USER) return this._id.equals(targetUser._id);
  if (this.role === ROLES.ADMIN) return targetUser.role !== ROLES.SUPERADMIN;
  if (this.role === ROLES.SUPERADMIN) return true;
  return false;
};

// Grant/revoke permission
userSchema.methods.grantPermission = function(permission) {
  if (!this.customPermissions) this.customPermissions = { granted: [], revoked: [] };
  const revokedIndex = this.customPermissions.revoked.indexOf(permission);
  if (revokedIndex > -1) this.customPermissions.revoked.splice(revokedIndex, 1);
  if (!this.customPermissions.granted.includes(permission)) this.customPermissions.granted.push(permission);
};

userSchema.methods.revokePermission = function(permission) {
  if (!this.customPermissions) this.customPermissions = { granted: [], revoked: [] };
  const grantedIndex = this.customPermissions.granted.indexOf(permission);
  if (grantedIndex > -1) this.customPermissions.granted.splice(grantedIndex, 1);
  if (!this.customPermissions.revoked.includes(permission)) this.customPermissions.revoked.push(permission);
};

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// To JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  delete obj.customPermissions;
  obj.permissions = this.getPermissions();
  return obj;
};

// Attach constants
userSchema.statics.ROLES = ROLES;
userSchema.statics.PERMISSIONS = PERMISSIONS;
userSchema.statics.ROLE_PERMISSIONS = ROLE_PERMISSIONS;

module.exports = mongoose.model('User', userSchema);
