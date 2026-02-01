const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary'); // adjust path if needed

// Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'blogs', // folder in Cloudinary
    allowed_formats: [
      'jpg','jpeg','png','gif','webp',
      'mp4','mov','avi',
      'pdf','doc','docx'
    ],
    resource_type: 'auto',
    transformation: [{ width: 1200, height: 630, crop: 'limit' }],
    public_id: (req, file) => {
      const name = file.originalname.split('.')[0];
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      return `${name}-${uniqueSuffix}`;
    }
  }
});

// Multer config
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 20 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg','image/png','image/gif','image/webp',
      'video/mp4','video/avi','video/mov',
      'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported!`), false);
    }
  }
});

// Export helper functions
module.exports = {
  fields: (fieldsArray) => (req, res, next) => {
    const middleware = upload.fields(fieldsArray);
    middleware(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  }
};
