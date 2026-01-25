const Event = require('../models/Event');
const Feedback = require('../models/Feedback');

/**
 * =====================================
 * CREATE EVENT
 * =====================================
 */
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      location,
      category,
      maxParticipants,
      goalAmount,
      currency,
      donationDeadline,
      allowDonations,
      status,
      isFeatured,
      isUrgent
    } = req.body;

    // Validation
    if (!title || !description || !category || !goalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, category, and goalAmount are required'
      });
    }

    // Date handling
    let eventDate = date ? new Date(date.trim()) : new Date();
    if (date && isNaN(eventDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    let donationEndDate;
    if (donationDeadline) {
      donationEndDate = new Date(donationDeadline.trim());
      if (isNaN(donationEndDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid donationDeadline format' });
      }
    }

    // File handling
    const files = [];
    if (req.files) {
      const pushFiles = (fileArray, type) => {
        if (Array.isArray(fileArray)) {
          fileArray.forEach(file => {
            if (file?.path) {
              files.push({
                url: file.path,
                public_id: file.filename || file.originalname,
                resource_type: type,
                original_name: file.originalname,
                size: file.size || 0
              });
            }
          });
        }
      };
      pushFiles(req.files.images, 'image');
      pushFiles(req.files.videos, 'video');
      pushFiles(req.files.documents, 'raw');
    }

    // Create Event
    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      date: eventDate,
      location: location?.trim() || 'Not specified',
      category,
      maxParticipants,
      goalAmount,
      currency,
      donationDeadline: donationEndDate,
      allowDonations,
      status,
      isFeatured,
      isUrgent,
      files
    });

    res.status(201).json({ success: true, message: 'Event created successfully', event });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ success: false, message: 'Failed to create event', error: error.message });
  }
};

/**
 * =====================================
 * GET ALL EVENTS (NOT DELETED) WITH FEEDBACK
 * =====================================
 */
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .populate({
        path: 'feedbacks',
        match: { isDeleted: false },
        populate: { path: 'userId', select: 'name email' }
      });

    res.status(200).json({ success: true, count: events.length, events });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch events', error: error.message });
  }
};

/**
 * =====================================
 * GET SINGLE EVENT WITH FEEDBACK
 * =====================================
 */
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate({
        path: 'feedbacks',
        match: { isDeleted: false },
        populate: { path: 'userId', select: 'name email' }
      });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.status(200).json({ success: true, event });

  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid event ID', error: error.message });
  }
};

/**
 * =====================================
 * UPDATE EVENT
 * =====================================
 */
exports.updateEvent = async (req, res) => {
  try {
    if (req.body.date) {
      req.body.date = new Date(req.body.date.trim());
      if (isNaN(req.body.date.getTime()))
        return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    if (req.body.donationDeadline) {
      req.body.donationDeadline = new Date(req.body.donationDeadline.trim());
      if (isNaN(req.body.donationDeadline.getTime()))
        return res.status(400).json({ success: false, message: 'Invalid donationDeadline format' });
    }

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate({
      path: 'feedbacks',
      match: { isDeleted: false },
      populate: { path: 'userId', select: 'name email' }
    });

    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    res.status(200).json({ success: true, message: 'Event updated successfully', event });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update event', error: error.message });
  }
};

/**
 * =====================================
 * SOFT DELETE EVENT
 * =====================================
 */
exports.softDeleteEvent = async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    res.status(200).json({ success: true, message: 'Event soft deleted successfully' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete event', error: error.message });
  }
};

/**
 * =====================================
 * RESTORE SOFT-DELETED EVENT
 * =====================================
 */
exports.restoreEvent = async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );

    if (!event) return res.status(404).json({ success: false, message: 'Event not found or not deleted' });

    res.status(200).json({ success: true, message: 'Event restored successfully', event });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to restore event', error: error.message });
  }
};

/**
 * =====================================
 * HARD DELETE EVENT
 * =====================================
 */
exports.hardDeleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    res.status(200).json({ success: true, message: 'Event permanently deleted' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to permanently delete event', error: error.message });
  }
};
