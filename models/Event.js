const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  /* ================= BASIC INFO ================= */
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },

  description: {
    type: String,
    required: [true, 'Description is required']
  },

  date: {
    type: Date,
    required: [true, 'Date is required']
  },

  location: {
    type: String,
    default: 'Not specified'
  },

  /* ================= CHARITY CATEGORY ================= */
  category: {
    type: String,
    enum: [
      'Education',
      'Health',
      'Food',
      'Emergency',
      'Orphans',
      'Environment',
      'Community',
      'Women',
      'Disability'
    ],
    required: true
  },

  /* ================= PARTICIPATION ================= */
  maxParticipants: {
    type: Number,
    min: 1
  },

  /* ================= DONATION / FUNDRAISING ================= */
  goalAmount: {
    type: Number,
    required: true
  },

  raisedAmount: {
    type: Number,
    default: 0
  },

  currency: {
    type: String,
    default: 'ETB'
  },

  donationDeadline: {
    type: Date
  },

  allowDonations: {
    type: Boolean,
    default: true
  },

  /* ================= EVENT STATUS ================= */
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },

  /* ================= MEDIA FILES ================= */
  files: [
    {
      url: String,
      public_id: String,
      resource_type: String,
      original_name: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  /* ================= IMPACT & REPORTING ================= */
  impactReport: {
    summary: String,
    peopleHelped: Number,
    reportImages: [String],
    publishedAt: Date
  },

  /* ================= FEATURED & URGENCY ================= */
  isFeatured: {
    type: Boolean,
    default: false
  },

  isUrgent: {
    type: Boolean,
    default: false
  },

  /* ================= SYSTEM FLAGS ================= */
  isActive: {
    type: Boolean,
    default: true
  },

  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: {
    type: Date
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
