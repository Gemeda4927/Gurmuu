// Update the createAuditLog function in permission.controller.js
const createAuditLog = async (user, targetUser, action, details, reason = '', req, additionalData = {}) => {
  try {
    const logData = {
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      action,
      details,
      reason,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      method: req.method,
      status: 'SUCCESS'
    };

    // Add target user info if exists
    if (targetUser) {
      logData.targetUserId = targetUser._id;
      logData.targetUserName = targetUser.name;
      logData.targetUserEmail = targetUser.email;
      logData.targetUserRole = targetUser.role;
    }

    // Add permission-specific data
    if (additionalData.permission) {
      logData.permission = additionalData.permission;
    }
    
    if (additionalData.permissions && additionalData.permissions.length > 0) {
      logData.permissions = additionalData.permissions;
    }
    
    // Add role-specific data
    if (additionalData.oldRole) {
      logData.oldRole = additionalData.oldRole;
    }
    
    if (additionalData.newRole) {
      logData.newRole = additionalData.newRole;
    }

    await AuditLog.create(logData);
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error, just log it
  }
};