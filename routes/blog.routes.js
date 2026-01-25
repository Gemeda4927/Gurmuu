const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const { protect, requireRole, requirePermission } = require('../middleware/auth');
const { ROLES, PERMISSIONS } = require('../constants/permissions.constants');
const upload = require('../utils/multer');

/**
 * create blog
 * role: admin / superadmin
 * permission: create_content
 */
router.post(
  '/',
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.CREATE_CONTENT),
  upload.fields([
    { name: 'images', maxCount: 5 }
  ]),
  blogController.createBlog
);

/**
 * get all blogs
 */
router.get('/', protect, blogController.getBlogs);

/**
 * get single blog
 */
router.get('/:id', protect, blogController.getBlogById);

/**
 * update blog
 */
router.put(
  '/:id',
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.EDIT_CONTENT),
  upload.fields([
    { name: 'images', maxCount: 5 }
  ]),
  blogController.updateBlog
);

/**
 * soft delete blog
 */
router.delete(
  '/soft/:id',
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.DELETE_CONTENT),
  blogController.softDeleteBlog
);

/**
 * restore blog
 */
router.patch(
  '/restore/:id',
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.MANAGE_CONTENT),
  blogController.restoreBlog
);

/**
 * hard delete blog
 */
router.delete(
  '/hard/:id',
  protect,
  requireRole([ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.DELETE_CONTENT),
  blogController.hardDeleteBlog
);

module.exports = router;
