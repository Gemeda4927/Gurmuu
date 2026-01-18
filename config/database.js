const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('ℹ️ MongoDB already connected');
    return;
  }

  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(process.env.MONGO_URI);

    isConnected = true;

    console.log(`🟢 MongoDB connected`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('🔴 MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;
