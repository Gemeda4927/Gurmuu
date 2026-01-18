const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },

    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false, 
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    avatar: {
      type: String,
      default: '', // store URL or file path
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 250,
      default: '',
    },

    social: {
      facebook: { type: String, trim: true },
      twitter: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      instagram: { type: String, trim: true },
    },

    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },

    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin'],
      default: 'user',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* =========================
   Password hashing before save
========================= */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/* =========================
   Compare password method
========================= */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/* =========================
   Remove sensitive fields from JSON
========================= */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
