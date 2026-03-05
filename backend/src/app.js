const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
require('dotenv').config();

const { connectDB, mongoose } = require('./config/database');
const { connectElasticsearch } = require('./config/elasticsearch');
const { connectRedis, disconnectRedis, isRedisConnected } = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

// Import models to register them
require('./models');

// Import passport config
require('./config/passport');

const app = express();

// Connect to database
connectDB();

// CORS configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000', // React App
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Routes
app.use('/api', routes);

// Health check
app.get('/health', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    if (!isConnected) {
      throw new Error('MongoDB disconnected');
    }

    res.status(200).json({
      status: 'OK',
      message: 'Server is running',
      database: 'Connected',
      redis: isRedisConnected() ? 'Connected' : 'Disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Server is running but database connection failed',
      database: 'Disconnected',
      redis: isRedisConnected() ? 'Connected' : 'Disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const PORT = process.env.PORT || 5000;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  const { disconnectElasticsearch } = require('./config/elasticsearch');
  
  await disconnectElasticsearch();
  await disconnectRedis();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  console.log('All connections closed. Exiting...');
  process.exit(0);
};

// Sync database and start server
const startServer = async () => {
  try {
    console.log('MongoDB models initialized');

    const SeedService = require('./services/SeedService');
    await SeedService.ensureRootAdmin();

    // Connect to Redis cache (optional)
    await connectRedis();

    // Connect to OpenSearch
    const esConnected = await connectElasticsearch();
    
    // Initialize search index if connected
    if (esConnected) {
      const SearchService = require('./services/SearchService');
      await SearchService.initIndex();
      await SearchService.bulkIndexProducts();
    }

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`API URL: http://localhost:${PORT}/api`);
    });

    // Handle port in use error
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use!`);
        console.log('Solutions:');
        console.log(`  1. Kill the process: taskkill /F /PID $(netstat -ano | findstr :${PORT})`);
        console.log(`  2. Use different port: set PORT=5001 && npm run dev`);
        process.exit(1);
      }
      throw err;
    });

    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
