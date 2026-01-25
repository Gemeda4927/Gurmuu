const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['Technology', 'Health', 'Education', 'Community', 'Lifestyle', 'News'],
    required: true
  },
  tags: [String],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  images: [
    {
      url: String,
      public_id: String,
      original_name: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Blog', blogSchema);
