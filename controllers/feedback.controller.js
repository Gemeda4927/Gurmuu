const Feedback = require('../models/Feedback');
const Event = require('../models/Event');

/**
 * CREATE FEEDBACK
 */
exports.createFeedback = async (req, res) => {
  try {
    const { eventId, rating, comment } = req.body;

    if (!eventId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'EventId and rating are required'
      });
    }

    const feedback = await Feedback.create({
      userId: req.user._id,
      eventId,
      rating,
      comment
    });

    res.status(201).json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create feedback', error: error.message });
  }
};

/**
 * GET ALL FEEDBACK FOR AN EVENT
 */
exports.getFeedbackByEvent = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ eventId: req.params.eventId, isDeleted: false });
    res.status(200).json({ success: true, count: feedbacks.length, feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get feedback', error: error.message });
  }
};

/**
 * UPDATE FEEDBACK
 */
exports.updateFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false, userId: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

    res.status(200).json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update feedback', error: error.message });
  }
};

/**
 * SOFT DELETE
 */
exports.softDeleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

    res.status(200).json({ success: true, message: 'Feedback soft deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete feedback', error: error.message });
  }
};

/**
 * RESTORE
 */
exports.restoreFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findOneAndUpdate(
      { _id: req.params.id, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found or not deleted' });

    res.status(200).json({ success: true, message: 'Feedback restored successfully', feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to restore feedback', error: error.message });
  }
};

/**
 * HARD DELETE
 */
exports.hardDeleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

    res.status(200).json({ success: true, message: 'Feedback permanently deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete feedback', error: error.message });
  }
};
