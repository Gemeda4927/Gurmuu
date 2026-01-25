const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String, default: 'Not specified' },
  category: {
    type: String,
    enum: ['Education','Health','Food','Emergency','Orphans','Environment','Community','Women','Disability'],
    required: true
  },
  maxParticipants: { type: Number, min: 1 },
  goalAmount: { type: Number, required: true },
  raisedAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'ETB' },
  donationDeadline: { type: Date },
  allowDonations: { type: Boolean, default: true },
  status: { type: String, enum: ['draft','published','ongoing','completed','cancelled'], default: 'draft' },
  files: [
    {
      url: String,
      public_id: String,
      resource_type: String,
      original_name: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  isFeatured: { type: Boolean, default: false },
  isUrgent: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  strictPopulate: false // needed for Mongoose 7+
});

// VIRTUAL: feedbacks
eventSchema.virtual('feedbacks', {
  ref: 'Feedback',
  localField: '_id',
  foreignField: 'eventId'
});

module.exports = mongoose.model('Event', eventSchema);
