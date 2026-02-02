const Blog = require("../models/Blog");

/**
 * =====================================
 * CREATE BLOG
 * =====================================
 */
exports.createBlog = async (req, res) => {
  try {
    // Destructure and normalize
    let { title, content, category, tags, status, isFeatured, excerpt, slug } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, content, and category are required",
      });
    }

    // Trim strings
    title = title.trim();
    content = content.trim();
    category = category.trim();
    status = status?.trim() || "draft"; // default
    slug = slug?.trim();
    excerpt = excerpt?.trim();

    // Convert Boolean fields
    isFeatured = isFeatured === true || isFeatured === "true";

    // Normalize tags
    if (typeof tags === "string") {
      tags = tags.split(",").map(t => t.trim());
    }

    // ===== Handle Files =====
    let coverImage = null;
    let gallery = [];

    if (req.files?.coverImage?.length) {
      const file = req.files.coverImage[0];
      coverImage = { url: file.path, public_id: file.filename };
    }

    if (req.files?.gallery?.length) {
      gallery = req.files.gallery.map(file => ({
        url: file.path,
        public_id: file.filename,
        uploadedAt: new Date(),
      }));
    }

    // ===== Create Blog =====
    const blog = await Blog.create({
      title,
      slug,
      excerpt,
      content,
      category,
      tags,
      status,
      isFeatured,
      coverImage,
      gallery,
      author: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog,
    });

  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: "Blog validation failed",
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create blog",
      error: error.message,
    });
  }
};

/**
 * =====================================
 * GET ALL BLOGS (PUBLIC)
 * =====================================
 */
/**
 * =====================================
 * GET ALL BLOGS (PUBLIC)
 * Includes deleted & non-deleted
 * =====================================
 */
exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find() 
      .populate("author", "name email")
      .sort({ publishedAt: -1 });

    res.status(200).json({
      success: true,
      count: blogs.length,
      blogs,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch blogs",
      error: error.message,
    });
  }
};


/**
 * =====================================
 * GET SINGLE BLOG
 * =====================================
 */
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, isDeleted: false })
      .populate("author", "name email");

    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    res.status(200).json({ success: true, blog });

  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid blog ID", error: error.message });
  }
};

/**
 * =====================================
 * UPDATE BLOG
 * =====================================
 */
exports.updateBlog = async (req, res) => {
  try {
    const updateData = {};

    // Trim & normalize
    if (req.body.title) updateData.title = req.body.title.trim();
    if (req.body.content) updateData.content = req.body.content.trim();
    if (req.body.category) updateData.category = req.body.category.trim();
    if (req.body.status) updateData.status = req.body.status.trim();
    if (req.body.slug) updateData.slug = req.body.slug.trim();
    if (req.body.excerpt) updateData.excerpt = req.body.excerpt.trim();

    if (req.body.isFeatured !== undefined) {
      updateData.isFeatured = req.body.isFeatured === true || req.body.isFeatured === "true";
    }

    if (req.body.tags) {
      if (typeof req.body.tags === "string") {
        updateData.tags = req.body.tags.split(",").map(t => t.trim());
      } else {
        updateData.tags = req.body.tags;
      }
    }

    // Handle files
    if (req.files?.coverImage?.length) {
      const file = req.files.coverImage[0];
      updateData.coverImage = { url: file.path, public_id: file.filename };
    }

    if (req.files?.gallery?.length) {
      updateData.$push = {
        gallery: req.files.gallery.map(file => ({
          url: file.path,
          public_id: file.filename,
          uploadedAt: new Date(),
        })),
      };
    }

    const blog = await Blog.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      updateData,
      { new: true, runValidators: true }
    );

    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    res.status(200).json({ success: true, message: "Blog updated successfully", blog });

  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: "Blog validation failed",
        errors: messages,
      });
    }

    res.status(500).json({ success: false, message: "Failed to update blog", error: error.message });
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
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    res.status(200).json({ success: true, message: "Blog soft deleted" });

  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete blog", error: error.message });
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

    if (!blog) return res.status(404).json({ success: false, message: "Blog not found or not deleted" });

    res.status(200).json({ success: true, message: "Blog restored successfully", blog });

  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to restore blog", error: error.message });
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

    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    res.status(200).json({ success: true, message: "Blog permanently deleted" });

  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to permanently delete blog", error: error.message });
  }
};
