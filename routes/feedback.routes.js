const express = require('express');
const router = express.Router();

const feedbackController = require('../controllers/feedback.controller');
const { protect, requireRole, requirePermission } = require('../middleware/auth');
const { ROLES, PERMISSIONS } = require('../constants/permissions.constants');

/**
 * ===============================
 * CREATE FEEDBACK
 * Any authenticated user can submit
 * ===============================
 */
router.post(
  '/',
  protect,
  feedbackController.createFeedback
);

/**
 * ===============================
 * GET FEEDBACKS FOR AN EVENT
 * Any authenticated user can view
 * ===============================
 */
router.get(
  '/event/:eventId',
  protect,
  feedbackController.getFeedbackByEvent
);

/**
 * ===============================
 * UPDATE FEEDBACK
 * Any authenticated user can edit
 * ===============================
 */
router.put(
  '/:id',
  protect,
  feedbackController.updateFeedback
);

/**
 * ===============================
 * SOFT DELETE FEEDBACK
 * Role: ADMIN/SUPERADMIN
 * Permission: DELETE_CONTENT
 * ===============================
 */
router.delete(
  '/soft/:id',
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.DELETE_CONTENT),
  feedbackController.softDeleteFeedback
);

/**
 * ===============================
 * RESTORE FEEDBACK
 * Role: ADMIN/SUPERADMIN
 * Permission: MANAGE_CONTENT
 * ===============================
 */
router.patch(
  '/restore/:id',
  protect,
  requireRole([ROLES.ADMIN, ROLES.SUPERADMIN]),
  requirePermission(PERMISSIONS.MANAGE_CONTENT),
  feedbackController.restoreFeedback
);

/**
 * ===============================
 * HARD DELETE FEEDBACK
 * Any authenticated user can delete
 * ===============================
 */
router.delete(
  '/hard/:id',
  protect,
  feedbackController.hardDeleteFeedback
);

module.exports = router;
