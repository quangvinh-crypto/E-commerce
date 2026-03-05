const Redis = require('ioredis');

let redisClient = null;
let redisConnected = false;

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const buildRedisOptions = () => {
  const redisUrl = process.env.REDIS_URL;
  const baseOptions = {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 10000,
  };

  if (redisUrl) {
    return { redisUrl, options: { ...baseOptions } };
  }

  const host = process.env.REDIS_HOST;
  if (!host) return null;

  const options = {
    ...baseOptions,
    host,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    username: process.env.REDIS_USER || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
  };

  if (toBool(process.env.REDIS_TLS, false)) {
    options.tls = {};
  }

  return { redisUrl: null, options };
};

const connectRedis = async () => {
  const redisConfig = buildRedisOptions();
  if (!redisConfig) {
    console.log('Redis: skipped (missing REDIS_URL or REDIS_HOST)');
    return false;
  }

  try {
    redisClient = redisConfig.redisUrl
      ? new Redis(redisConfig.redisUrl, redisConfig.options)
      : new Redis(redisConfig.options);

    redisClient.on('ready', () => {
      redisConnected = true;
      console.log('Redis: connected');
    });

    redisClient.on('end', () => {
      redisConnected = false;
      console.log('Redis: disconnected');
    });

    redisClient.on('error', (error) => {
      redisConnected = false;
      console.error('Redis error:', error.message);
    });

    await redisClient.connect();
    redisConnected = true;
    return true;
  } catch (error) {
    redisConnected = false;
    console.error('Redis connection failed:', error.message);
    return false;
  }
};

const disconnectRedis = async () => {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch (_) {
    try {
      redisClient.disconnect();
    } catch (__ ) {
      // Ignore disconnect errors
    }
  } finally {
    redisConnected = false;
    redisClient = null;
  }
};

const getRedisClient = () => redisClient;
const isRedisConnected = () => Boolean(redisClient && redisConnected);

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  isRedisConnected,
};
