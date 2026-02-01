const express = require("express");
const router = express.Router();

const blogController = require("../controllers/blog.controller");
const { protect, requireRole, requirePermission } = require("../middleware/auth");
const { ROLES, PERMISSIONS } = require("../constants/permissions.constants");
const upload = require("../utils/multer");

/**
 * CREATE BLOG
 */
router.post(
  "/",
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.CREATE_CONTENT),


upload.fields([
  { name: "coverImage", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
])


,

  blogController.createBlog
);

/**
 * GET ALL BLOGS (PUBLIC)
 */
router.get("/", blogController.getBlogs);

/**
 * GET SINGLE BLOG (PUBLIC)
 */
router.get("/:id", blogController.getBlogById);

/**
 * UPDATE BLOG
 */
router.put(
  "/:id",
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.EDIT_CONTENT),
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  blogController.updateBlog
);

/**
 * SOFT DELETE BLOG
 */
router.delete(
  "/soft/:id",
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.DELETE_CONTENT),
  blogController.softDeleteBlog
);

/**
 * RESTORE BLOG
 */
router.patch(
  "/restore/:id",
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.MANAGE_CONTENT),
  blogController.restoreBlog
);

/**
 * HARD DELETE BLOG
 */
router.delete(
  "/hard/:id",
  protect,
  requireRole([ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.DELETE_CONTENT),
  blogController.hardDeleteBlog
);

module.exports = router;
