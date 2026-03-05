jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(),
  isRedisConnected: jest.fn(),
}));

const { getRedisClient, isRedisConnected } = require('../../src/config/redis');
const CacheService = require('../../src/services/CacheService');

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REDIS_CACHE_ENABLED = 'true';
    process.env.REDIS_KEY_PREFIX = 'ecommerce';
    process.env.REDIS_DEFAULT_TTL = '120';
  });

  it('returns disabled when redis is not connected', () => {
    isRedisConnected.mockReturnValue(false);
    expect(CacheService.isEnabled()).toBe(false);
  });

  it('uses remember to return cached data on second call', async () => {
    const store = new Map();
    const redisMock = {
      get: jest.fn(async (key) => store.get(key) || null),
      set: jest.fn(async (key, value) => {
        store.set(key, value);
      }),
    };

    isRedisConnected.mockReturnValue(true);
    getRedisClient.mockReturnValue(redisMock);

    const producer = jest.fn(async () => ({ ok: true, value: 1 }));

    const first = await CacheService.remember('products:list', { page: 1 }, 60, producer);
    const second = await CacheService.remember('products:list', { page: 1 }, 60, producer);

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(producer).toHaveBeenCalledTimes(1);
    expect(redisMock.set).toHaveBeenCalledTimes(1);
  });
});
