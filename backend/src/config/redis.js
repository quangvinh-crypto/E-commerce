const Redis = require('ioredis');

let redisClient = null;
let isConnected = false;

// Create Redis client
const createRedisClient = () => {
  if (redisClient) return redisClient;

  // Build connection URL for Aiven Redis with TLS
  const redisUrl = process.env.REDIS_TLS === 'true'
    ? `rediss://${process.env.REDIS_USER}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    : `redis://${process.env.REDIS_USER}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

  redisClient = new Redis(redisUrl, {
    tls: process.env.REDIS_TLS === 'true' ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) {
        console.log('Redis: Max retries reached, stopping');
        return null;
      }
      return Math.min(times * 1000, 3000);
    },
  });

  redisClient.on('connect', () => console.log('Redis: Connecting...'));
  redisClient.on('ready', () => {
    isConnected = true;
    console.log('Redis: Connected successfully');
  });
  redisClient.on('error', (err) => {
    isConnected = false;
    console.error('Redis error:', err.message);
    if (err.message.includes('WRONGPASS') || err.message.includes('NOAUTH')) {
      redisClient.disconnect();
    }
  });
  redisClient.on('close', () => { isConnected = false; });

  return redisClient;
};

const connectRedis = async () => {
  try {
    const client = createRedisClient();
    await client.ping();
    return client;
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    console.log('Server will continue without Redis');
    if (redisClient) {
      redisClient.disconnect();
      redisClient = null;
    }
    return null;
  }
};

const getRedisClient = () => redisClient;
const isRedisConnected = () => isConnected;
const disconnectRedis = async () => {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
    isConnected = false;
  }
};

module.exports = { connectRedis, getRedisClient, isRedisConnected, disconnectRedis };