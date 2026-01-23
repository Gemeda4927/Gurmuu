const Event = require('../models/Event');

/**
 * Create a new event with file uploads
 */
exports.createEvent = async (req, res) => {
  try {
    console.log('📤 Creating event...');
    console.log('Request body:', req.body);
    console.log('Files received:', req.files);
    
    // Validate required fields
    if (!req.body.title || !req.body.description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and description are required' 
      });
    }
    
    // Fix 1: Handle date - trim spaces and validate
    let eventDate;
    if (req.body.date) {
      // Trim any leading/trailing spaces
      const trimmedDate = req.body.date.trim();
      eventDate = new Date(trimmedDate);
      
      // Check if date is valid
      if (isNaN(eventDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use ISO format: YYYY-MM-DDTHH:mm:ss.sssZ'
        });
      }
    } else {
      // Use current date if not provided
      eventDate = new Date();
    }
    
    // Fix 2: Process files safely
    const files = [];

    // Check if req.files exists and has properties
    if (req.files) {
      // Process images if they exist
      if (req.files.images && Array.isArray(req.files.images)) {
        req.files.images.forEach(file => {
          if (file && file.path) {
            files.push({
              url: file.path,
              public_id: file.filename || file.public_id || file.originalname,
              resource_type: 'image',
              original_name: file.originalname || 'unknown',
              size: file.size || 0
            });
          }
        });
      }

      // Process videos if they exist
      if (req.files.videos && Array.isArray(req.files.videos)) {
        req.files.videos.forEach(file => {
          if (file && file.path) {
            files.push({
              url: file.path,
              public_id: file.filename || file.public_id || file.originalname,
              resource_type: 'video',
              original_name: file.originalname || 'unknown',
              size: file.size || 0
            });
          }
        });
      }

      // Process documents if they exist
      if (req.files.documents && Array.isArray(req.files.documents)) {
        req.files.documents.forEach(file => {
          if (file && file.path) {
            files.push({
              url: file.path,
              public_id: file.filename || file.public_id || file.originalname,
              resource_type: 'raw',
              original_name: file.originalname || 'unknown',
              size: file.size || 0
            });
          }
        });
      }
    }

    // Fix 3: Handle createdBy - check if your Event model requires it
    // If your Event model has createdBy as required, you need to provide it
    // If auth isn't implemented, you might need to:
    // 1. Remove "required: true" from your Event model
    // 2. Or pass a default user ID for testing
    // 3. Or implement proper authentication
    
    // For testing: Check if we have user from auth middleware
    let createdBy = null;
    
    // Try to get user from different possible locations
    if (req.user) {
      createdBy = req.user._id || req.user.id || req.user.userId;
    }
    
    // If still null and your model requires it, use a test user ID
    // You need to get an actual user ID from your database
    // First, create a test user or use an existing one
    if (!createdBy) {
      // Uncomment this if you want to use a test user ID
      // createdBy = 'YOUR_TEST_USER_ID_HERE'; // Replace with actual user ID
      
      // OR modify your Event model to make createdBy optional
      // In your Event model, change: createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
      // To: createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
    }

    // Create event object
    const eventData = {
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      date: eventDate,
      location: req.body.location ? req.body.location.trim() : 'Not specified',
      files: files
    };
    
    // Only add createdBy if we have it
    if (createdBy) {
      eventData.createdBy = createdBy;
    }

    const event = new Event(eventData);
    await event.save();
    
    console.log('✅ Event created successfully:', event._id);
    
    res.status(201).json({ 
      success: true, 
      message: 'Event created successfully',
      event: {
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        files: event.files,
        location: event.location,
        filesCount: event.files.length,
        createdBy: event.createdBy || 'Not specified'
      }
    });
  } catch (error) {
    console.error('❌ Event creation error:', error);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate event detected'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create event',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get all events
 */
exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find().populate('createdBy', 'name email');
    
    res.status(200).json({ 
      success: true, 
      count: events.length,
      events 
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch events',
      error: error.message 
    });
  }
};

/**
 * Get a single event by ID
 */
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'name email');
    
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      event 
    });
  } catch (error) {
    console.error('Get event by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch event',
      error: error.message 
    });
  }
};

/**
 * Update an event
 */
exports.updateEvent = async (req, res) => {
  try {
    // Check if date needs processing
    if (req.body.date) {
      req.body.date = new Date(req.body.date.trim());
      if (isNaN(req.body.date.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
    }
    
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Event updated successfully',
      event 
    });
  } catch (error) {
    console.error('Update event error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update event',
      error: error.message 
    });
  }
};

/**
 * Delete an event
 */
exports.deleteEvent = async (req, res) => {
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
      message: 'Event deleted successfully',
      deletedEvent: {
        id: event._id,
        title: event.title
      }
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete event',
      error: error.message 
    });
  }
};