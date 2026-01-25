// User roles
const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin'
};

// Available permissions
const PERMISSIONS = {
  VIEW_CONTENT: 'view_content', // added for default viewing

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
  
  // Blogs
  CREATE_BLOG: 'create_blog',
  EDIT_BLOG: 'edit_blog',
  DELETE_BLOG: 'delete_blog',
  PUBLISH_BLOG: 'publish_blog',

  // Events
  CREATE_EVENT: 'create_event',
  EDIT_EVENT: 'edit_event',
  DELETE_EVENT: 'delete_event',
  PUBLISH_EVENT: 'publish_event',

  // Feedback
  MANAGE_FEEDBACK: 'manage_feedback',
  DELETE_FEEDBACK: 'delete_feedback',

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
  [ROLES.USER]: [
    PERMISSIONS.VIEW_CONTENT // only default view permission
  ],
  [ROLES.ADMIN]: [
    // Users
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.DEACTIVATE_USERS,
    PERMISSIONS.VIEW_ALL_USERS,

    // Content
    PERMISSIONS.MANAGE_CONTENT,
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.EDIT_CONTENT,
    PERMISSIONS.DELETE_CONTENT,
    PERMISSIONS.PUBLISH_CONTENT,

    // Blogs
    PERMISSIONS.CREATE_BLOG,
    PERMISSIONS.EDIT_BLOG,
    PERMISSIONS.DELETE_BLOG,
    PERMISSIONS.PUBLISH_BLOG,

    // Events
    PERMISSIONS.CREATE_EVENT,
    PERMISSIONS.EDIT_EVENT,
    PERMISSIONS.DELETE_EVENT,
    PERMISSIONS.PUBLISH_EVENT,

    // Feedback
    PERMISSIONS.MANAGE_FEEDBACK,
    PERMISSIONS.DELETE_FEEDBACK,

    // Analytics
    PERMISSIONS.VIEW_ANALYTICS,

    // Notifications
    PERMISSIONS.SEND_NOTIFICATIONS,
  ],
  [ROLES.SUPERADMIN]: Object.values(PERMISSIONS) // All permissions
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS
};
