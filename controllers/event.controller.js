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
 * GET ALL EVENTS WITH FILTERS
 * =====================================
 * Query Parameters:
 * - deleted: true/false (get deleted/active events)
 * - isDeleted: true/false (alternative parameter)
 * - status: draft/published/cancelled
 * - category: string
 * - featured: true/false
 * - urgent: true/false
 */
exports.getEvents = async (req, res) => {
  try {
    const {
      deleted,
      isDeleted,
      status,
      category,
      featured,
      urgent,
      search
    } = req.query;

    // Build filter
    const filter = {};

    // Handle deleted filter
    if (deleted === 'true' || isDeleted === 'true') {
      filter.isDeleted = true;
    } else if (deleted === 'false' || isDeleted === 'false') {
      filter.isDeleted = false;
    } else {
      // Default: show only active events
      filter.isDeleted = { $ne: true };
    }

    // Add other filters
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (featured) filter.isFeatured = featured === 'true';
    if (urgent) filter.isUrgent = urgent === 'true';

    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Get events with feedbacks
    const events = await Event.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: 'feedbacks',
        match: { isDeleted: false },
        populate: { path: 'userId', select: 'name email' }
      });

    // Calculate total raised amount for active events
    const totalRaised = events.reduce((sum, event) => sum + (event.raisedAmount || 0), 0);

    res.status(200).json({
      success: true,
      count: events.length,
      totalRaised,
      events,
      filters: {
        deleted: filter.isDeleted,
        status,
        category
      }
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch events', error: error.message });
  }
};

/**
 * =====================================
 * GET SINGLE EVENT (WORKS FOR BOTH ACTIVE AND DELETED)
 * =====================================
 */
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
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
    console.error('Get event by ID error:', error);
    res.status(400).json({ success: false, message: 'Invalid event ID', error: error.message });
  }
};

/**
 * =====================================
 * UPDATE EVENT (ONLY ACTIVE EVENTS)
 * =====================================
 */
exports.updateEvent = async (req, res) => {
  try {
    // Check if event exists and is not deleted
    const existingEvent = await Event.findOne({ 
      _id: req.params.id, 
      isDeleted: { $ne: true } 
    });

    if (!existingEvent) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found or has been deleted' 
      });
    }

    // Parse dates if provided
    if (req.body.date) {
      req.body.date = new Date(req.body.date.trim());
      if (isNaN(req.body.date.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date format' });
      }
    }

    if (req.body.donationDeadline) {
      req.body.donationDeadline = new Date(req.body.donationDeadline.trim());
      if (isNaN(req.body.donationDeadline.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid donationDeadline format' });
      }
    }

    // Update event
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate({
      path: 'feedbacks',
      match: { isDeleted: false },
      populate: { path: 'userId', select: 'name email' }
    });

    res.status(200).json({ 
      success: true, 
      message: 'Event updated successfully', 
      event 
    });

  } catch (error) {
    console.error('Update event error:', error);
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
      { 
        isDeleted: true, 
        deletedAt: new Date(),
        status: 'deleted' // Optional: update status
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found or already deleted' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Event moved to trash successfully',
      event 
    });

  } catch (error) {
    console.error('Soft delete error:', error);
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
      { 
        isDeleted: false, 
        deletedAt: null,
        status: 'published' // Restore to published status
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found or not deleted' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Event restored successfully', 
      event 
    });

  } catch (error) {
    console.error('Restore event error:', error);
    res.status(500).json({ success: false, message: 'Failed to restore event', error: error.message });
  }
};

/**
 * =====================================
 * HARD DELETE EVENT (PERMANENT)
 * =====================================
 */
exports.hardDeleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Event permanently deleted' 
    });

  } catch (error) {
    console.error('Hard delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to permanently delete event', error: error.message });
  }
};

/**
 * =====================================
 * GET EVENT STATISTICS
 * =====================================
 */
exports.getEventStats = async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const activeEvents = await Event.countDocuments({ isDeleted: { $ne: true } });
    const deletedEvents = await Event.countDocuments({ isDeleted: true });
    const publishedEvents = await Event.countDocuments({ 
      isDeleted: { $ne: true }, 
      status: 'published' 
    });
    const draftEvents = await Event.countDocuments({ 
      isDeleted: { $ne: true }, 
      status: 'draft' 
    });
    const featuredEvents = await Event.countDocuments({ 
      isDeleted: { $ne: true }, 
      isFeatured: true 
    });

    // Calculate total raised amount
    const allEvents = await Event.find({ isDeleted: { $ne: true } });
    const totalRaised = allEvents.reduce((sum, event) => sum + (event.raisedAmount || 0), 0);
    const totalGoal = allEvents.reduce((sum, event) => sum + (event.goalAmount || 0), 0);

    res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        activeEvents,
        deletedEvents,
        publishedEvents,
        draftEvents,
        featuredEvents,
        totalRaised,
        totalGoal,
        completionPercentage: totalGoal > 0 ? ((totalRaised / totalGoal) * 100).toFixed(2) : 0
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics', error: error.message });
  }
};

/**
 * =====================================
 * BULK ACTIONS
 * =====================================
 */
exports.bulkActions = async (req, res) => {
  try {
    const { action, eventIds } = req.body;

    if (!action || !eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Action and eventIds array are required'
      });
    }

    let update;
    let message;

    switch (action) {
      case 'softDelete':
        update = { isDeleted: true, deletedAt: new Date(), status: 'deleted' };
        message = 'Events moved to trash successfully';
        break;
      case 'restore':
        update = { isDeleted: false, deletedAt: null, status: 'published' };
        message = 'Events restored successfully';
        break;
      case 'publish':
        update = { status: 'published' };
        message = 'Events published successfully';
        break;
      case 'draft':
        update = { status: 'draft' };
        message = 'Events moved to draft successfully';
        break;
      case 'feature':
        update = { isFeatured: true };
        message = 'Events featured successfully';
        break;
      case 'unfeature':
        update = { isFeatured: false };
        message = 'Events unfeatured successfully';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    const result = await Event.updateMany(
      { _id: { $in: eventIds } },
      { $set: update }
    );

    res.status(200).json({
      success: true,
      message,
      result: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({ success: false, message: 'Failed to perform bulk action', error: error.message });
  }
};