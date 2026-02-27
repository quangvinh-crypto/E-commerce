const mongoose = require('mongoose');

const defaultMongoUri = 'mongodb://admin:123456@localhost:27017/ecommerce?authSource=admin';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || defaultMongoUri;
    await mongoose.connect(mongoUri, {
      autoIndex: true,
    });

    console.log('MongoDB Connected Successfully');
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Server: ${mongoose.connection.host}:${mongoose.connection.port}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.error('Server will continue without database connection');
  }
};

module.exports = { mongoose, connectDB };
