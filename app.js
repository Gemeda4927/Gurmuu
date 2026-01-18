const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

const app = express();

/* ======================
   Security Middleware
====================== */
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

// Rate limiter (basic protection)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* ======================
   Body Parsing
====================== */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

/* ======================
   Logging
====================== */
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

/* ======================
   Routes
====================== */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Gurmuu Backend API',
    version: '1.0.0',
    status: 'Running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

/* ======================
   404 Handler
====================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

/* ======================
   Global Error Handler
====================== */
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

module.exports = app;
