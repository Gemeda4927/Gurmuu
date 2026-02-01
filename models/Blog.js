const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    // ===== Core Content =====
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    excerpt: {
      type: String,
      maxlength: 300,
    },

    content: {
      type: String,
      required: true,
    },

    // ===== Ownership =====
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ===== Organization =====
    category: {
      type: String,
      enum: ["Technology", "Health", "Education", "Community", "Lifestyle", "News"],
      required: true,
      index: true,
    },

    tags: {
      type: [String],
      index: true,
    },

    // ===== Publishing Control =====
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },

    publishedAt: {
      type: Date,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ===== Media =====
    coverImage: {
      url: String,
      public_id: String,
    },

    gallery: [
      {
        url: String,
        public_id: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ===== Soft Delete =====
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ===== Indexes =====
blogSchema.index({ title: "text", content: "text" });

// ===== Middleware =====
blogSchema.pre("save", function (next) {
  if (this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model("Blog", blogSchema);
