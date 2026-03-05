const crypto = require('crypto');
const { getRedisClient, isRedisConnected } = require('../config/redis');

class CacheService {
  getPrefix() {
    return process.env.REDIS_KEY_PREFIX || 'ecommerce';
  }

  getDefaultTtl() {
    const parsed = parseInt(process.env.REDIS_DEFAULT_TTL || '120', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 120;
  }

  isEnabled() {
    return process.env.REDIS_CACHE_ENABLED !== 'false' && isRedisConnected();
  }

  hashPayload(payload) {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    return crypto.createHash('sha1').update(raw).digest('hex');
  }

  buildCacheKey(scope, payload = {}) {
    return `${this.getPrefix()}:${scope}:${this.hashPayload(payload)}`;
  }

  buildScopePattern(scope) {
    return `${this.getPrefix()}:${scope}:*`;
  }

  async get(key) {
    if (!this.isEnabled()) return null;
    const client = getRedisClient();
    const raw = await client.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  async set(key, value, ttlSeconds) {
    if (!this.isEnabled()) return false;
    const client = getRedisClient();
    const ttl = ttlSeconds || this.getDefaultTtl();

    await client.set(key, JSON.stringify(value), 'EX', ttl);
    return true;
  }

  async del(key) {
    if (!this.isEnabled()) return 0;
    const client = getRedisClient();
    return client.del(key);
  }

  async remember(scope, payload, ttlSeconds, producer) {
    const key = this.buildCacheKey(scope, payload);
    const cached = await this.get(key);
    if (cached !== null) return { data: cached, cacheHit: true, key };

    const freshData = await producer();
    await this.set(key, freshData, ttlSeconds);
    return { data: freshData, cacheHit: false, key };
  }

  async deleteByPattern(pattern) {
    if (!this.isEnabled()) return 0;

    const client = getRedisClient();
    let cursor = '0';
    let deleted = 0;

    do {
      const scanResult = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = scanResult[0];
      const keys = scanResult[1] || [];

      if (keys.length > 0) {
        deleted += await client.del(...keys);
      }
    } while (cursor !== '0');

    return deleted;
  }

  async invalidateScopes(scopes = []) {
    if (!Array.isArray(scopes) || scopes.length === 0) return 0;

    let totalDeleted = 0;
    for (const scope of scopes) {
      totalDeleted += await this.deleteByPattern(this.buildScopePattern(scope));
    }

    return totalDeleted;
  }
}

module.exports = new CacheService();
