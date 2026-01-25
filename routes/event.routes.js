const express = require('express');
const router = express.Router();

const eventController = require('../controllers/event.controller');
const upload = require('../utils/multer');
const { protect, requireRole, requirePermission } = require('../middleware/auth');
const { ROLES, PERMISSIONS } = require('../constants/permissions.constants');

/**
 * ===============================
 * CREATE EVENT
 * Role: ADMIN/SUPERADMIN
 * Permission: CREATE_CONTENT
 * ===============================
 */
router.post(
  '/',
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),

  requirePermission(PERMISSIONS.CREATE_CONTENT),


  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 5 },
    { name: 'documents', maxCount: 5 }
  ]),
  eventController.createEvent
);

/**
 * ===============================
 * GET EVENTS
 * Any authenticated user
 * ===============================
 */
router.get('/', protect, eventController.getEvents);
router.get('/:id', protect, eventController.getEventById);

/**
 * ===============================
 * UPDATE EVENT
 * Role: ADMIN/SUPERADMIN
 * Permission: EDIT_CONTENT
 * ===============================
 */
router.put(
  '/:id',
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.EDIT_CONTENT),
  eventController.updateEvent
);

/**
 * ===============================
 * SOFT DELETE EVENT
 * Role: ADMIN/SUPERADMIN
 * Permission: DELETE_CONTENT
 * ===============================
 */
router.delete(
  '/soft/:id',
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.DELETE_CONTENT),
  eventController.softDeleteEvent
);

/**
 * ===============================
 * RESTORE SOFT-DELETED EVENT
 * Role: ADMIN/SUPERADMIN
 * Permission: MANAGE_CONTENT
 * ===============================
 */
router.patch(
  '/restore/:id',
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.MANAGE_CONTENT),
  eventController.restoreEvent
);

/**
 * ===============================
 * HARD DELETE EVENT
 * Role: SUPERADMIN only
 * Permission: DELETE_CONTENT
 * ===============================
 */
router.delete(
  '/hard/:id',
  protect,
  requireRole([ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.DELETE_CONTENT),
  eventController.hardDeleteEvent
);

module.exports = router;
