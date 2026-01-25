const Blog = require('../models/Blog');

/**
 * =====================================
 * CREATE BLOG
 * =====================================
 */
exports.createBlog = async (req, res) => {
  try {
    const { title, content, category, tags, status, isFeatured } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and category are required'
      });
    }

    // Handle uploaded images
    const images = [];
    if (req.files && req.files.images) {
      req.files.images.forEach(file => {
        images.push({
          url: file.path,
          public_id: file.filename || file.originalname,
          original_name: file.originalname,
          size: file.size
        });
      });
    }

    const blog = await Blog.create({
      title,
      content,
      category,
      tags,
      status,
      isFeatured,
      images,
      author: req.user._id
    });

    res.status(201).json({ success: true, message: 'Blog created', blog });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create blog', error: error.message });
  }
};

/**
 * =====================================
 * GET ALL BLOGS
 * =====================================
 */
exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ isDeleted: { $ne: true } })
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: blogs.length, blogs });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch blogs', error: error.message });
  }
};

/**
 * =====================================
 * GET SINGLE BLOG
 * =====================================
 */
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate('author', 'name email');

    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    res.status(200).json({ success: true, blog });

  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid blog ID', error: error.message });
  }
};

/**
 * =====================================
 * UPDATE BLOG
 * =====================================
 */
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    res.status(200).json({ success: true, message: 'Blog updated', blog });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update blog', error: error.message });
  }
};

/**
 * =====================================
 * SOFT DELETE BLOG
 * =====================================
 */
exports.softDeleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    res.status(200).json({ success: true, message: 'Blog soft deleted' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete blog', error: error.message });
  }
};

/**
 * =====================================
 * RESTORE BLOG
 * =====================================
 */
exports.restoreBlog = async (req, res) => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { _id: req.params.id, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );

    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found or not deleted' });

    res.status(200).json({ success: true, message: 'Blog restored', blog });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to restore blog', error: error.message });
  }
};

/**
 * =====================================
 * HARD DELETE BLOG
 * =====================================
 */
exports.hardDeleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);

    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

    res.status(200).json({ success: true, message: 'Blog permanently deleted' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to permanently delete blog', error: error.message });
  }
};
