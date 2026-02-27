/**
 * Database Connect Script
 * Run: node src/config/syncDatabase.js
 */
require('dotenv').config();
const { connectDB, mongoose } = require('./database');

// Import all models
require('../models');

const syncDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected!');

    console.log('MongoDB does not require table sync.');
    console.log('Collections will be created automatically when data is inserted.');

    await mongoose.connection.close();
    
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error.message);
    process.exit(1);
  }
};

syncDatabase();
