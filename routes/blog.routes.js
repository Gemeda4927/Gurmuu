const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const { protect, requireRole, requirePermission } = require('../middleware/auth');
const { ROLES, PERMISSIONS } = require('../constants/permissions.constants');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // basic multer setup

// CREATE BLOG (any authenticated user)
router.post('/', protect, upload.array('images', 5), blogController.createBlog);

// GET ALL BLOGS
router.get('/', blogController.getBlogs);

// GET SINGLE BLOG
router.get('/:id', blogController.getBlogById);

// UPDATE BLOG
router.put('/:id', protect, blogController.updateBlog);

// SOFT DELETE BLOG
router.delete(
  '/soft/:id',
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.DELETE_CONTENT),
  blogController.softDeleteBlog
);

// RESTORE BLOG
router.patch(
  '/restore/:id',
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.MANAGE_CONTENT),
  blogController.restoreBlog
);

// HARD DELETE BLOG
router.delete(
  '/hard/:id',
  protect,
  requireRole([ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.DELETE_CONTENT),
  blogController.hardDeleteBlog
);

module.exports = router;
