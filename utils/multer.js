const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

/**
 * Cloudinary storage configuration
 */
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'events',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx'],
    resource_type: 'auto',
    transformation: [{ width: 1200, height: 630, crop: 'limit' }],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = file.originalname.split('.')[0];
      return `${filename}-${uniqueSuffix}`;
    }
  }
});

/**
 * Multer configuration
 */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 20
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported!`), false);
    }
  }
});

/**
 * Safe wrapper for fields() to prevent Node crash
 * fieldsArray = [{ name: 'images', maxCount: 10 }, ...]
 */
const safeFields = (fieldsArray) => {
  return (req, res, next) => {
    if (!req || !req.headers) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }
    const middleware = upload.fields(fieldsArray);
    middleware(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  };
};

// Export multer functions
module.exports = {
  single: upload.single('file'),
  array: upload.array('files', 20),
  any: upload.any(),
  fields: safeFields // now use safeFields in your routes
};
