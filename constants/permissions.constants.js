// User roles
const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin'
};

// Available permissions
const PERMISSIONS = {
  // User Management
  MANAGE_USERS: 'manage_users',
  DEACTIVATE_USERS: 'deactivate_users',
  VIEW_ALL_USERS: 'view_all_users',
  
  // Content Management
  MANAGE_CONTENT: 'manage_content',
  CREATE_CONTENT: 'create_content',
  EDIT_CONTENT: 'edit_content',
  DELETE_CONTENT: 'delete_content',
  PUBLISH_CONTENT: 'publish_content',
  
  // Settings
  MANAGE_SETTINGS: 'manage_settings',
  UPDATE_SYSTEM_SETTINGS: 'update_system_settings',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  
  // Roles & Permissions
  MANAGE_ROLES: 'manage_roles',
  ASSIGN_PERMISSIONS: 'assign_permissions',
  
  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',
  
  // Notifications
  SEND_NOTIFICATIONS: 'send_notifications',
  MANAGE_NOTIFICATIONS: 'manage_notifications',
};

// Default permissions for each role
const ROLE_PERMISSIONS = {
  [ROLES.USER]: [],
  [ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.DEACTIVATE_USERS,
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.MANAGE_CONTENT,
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.EDIT_CONTENT,
    PERMISSIONS.DELETE_CONTENT,
    PERMISSIONS.PUBLISH_CONTENT,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.SEND_NOTIFICATIONS,
  ],
  [ROLES.SUPERADMIN]: Object.values(PERMISSIONS),
};

// Export all constants
module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS
};