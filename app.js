const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import all routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const permissionRoutes = require('./routes/permission.routes');
const eventRoutes = require('./routes/event.routes');
const blogRoutes = require('./routes/blog.routes'); // <-- added blog routes

const app = express();

// =====================
// Middleware
// =====================
app.use(helmet()); 
app.use(cors());   
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// Logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// =====================
// API Routes
// =====================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/permissions', permissionRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/blogs', blogRoutes); // <-- mount blog routes here

// Export the app
module.exports = app;
