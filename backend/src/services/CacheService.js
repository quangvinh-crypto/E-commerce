const { getRedisClient, isRedisConnected } = require('../config/redis');

// Default TTL: 1 hour
const DEFAULT_TTL = 3600;

// Cache key prefixes
const CACHE_KEYS = {
  PRODUCT: 'product:',
  PRODUCT_LIST: 'products:list:',
  PRODUCT_SEARCH: 'products:search:',
  CATEGORY: 'category:',
  CATEGORY_LIST: 'categories:list:',
};

class CacheService {
  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached data or null
   */
  async get(key) {
    if (!isRedisConnected()) {
      return null;
    }

    try {
      const client = getRedisClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, data, ttl = DEFAULT_TTL) {
    if (!isRedisConnected()) {
      return false;
    }

    try {
      const client = getRedisClient();
      await client.setex(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Delete data from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    if (!isRedisConnected()) {
      return false;
    }

    try {
      const client = getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., 'products:*')
   * @returns {Promise<number>} Number of deleted keys
   */
  async delByPattern(pattern) {
    if (!isRedisConnected()) {
      return 0;
    }

    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      
      if (keys.length > 0) {
        await client.del(...keys);
      }
      
      return keys.length;
    } catch (error) {
      console.error('Cache delete by pattern error:', error.message);
      return 0;
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>} Success status
   */
  async clearAll() {
    if (!isRedisConnected()) {
      return false;
    }

    try {
      const client = getRedisClient();
      await client.flushdb();
      return true;
    } catch (error) {
      console.error('Cache clear all error:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  async getStats() {
    if (!isRedisConnected()) {
      return { connected: false };
    }

    try {
      const client = getRedisClient();
      const info = await client.info('memory');
      const dbSize = await client.dbsize();
      
      return {
        connected: true,
        keys: dbSize,
        memory: info,
      };
    } catch (error) {
      console.error('Cache stats error:', error.message);
      return { connected: false, error: error.message };
    }
  }

  // ==================== Product Cache Methods ====================

  /**
   * Get product from cache
   * @param {number} id - Product ID
   * @returns {Promise<Object|null>} Product data
   */
  async getProduct(id) {
    return this.get(`${CACHE_KEYS.PRODUCT}${id}`);
  }

  /**
   * Set product in cache
   * @param {number} id - Product ID
   * @param {Object} product - Product data
   * @param {number} ttl - TTL in seconds
   */
  async setProduct(id, product, ttl = DEFAULT_TTL) {
    return this.set(`${CACHE_KEYS.PRODUCT}${id}`, product, ttl);
  }

  /**
   * Delete product from cache
   * @param {number} id - Product ID
   */
  async delProduct(id) {
    return this.del(`${CACHE_KEYS.PRODUCT}${id}`);
  }

  /**
   * Invalidate all product-related cache
   */
  async invalidateProductCache() {
    await this.delByPattern(`${CACHE_KEYS.PRODUCT}*`);
    await this.delByPattern(`${CACHE_KEYS.PRODUCT_LIST}*`);
    await this.delByPattern(`${CACHE_KEYS.PRODUCT_SEARCH}*`);
  }

  /**
   * Get product list from cache
   * @param {string} queryHash - Hash of query parameters
   */
  async getProductList(queryHash) {
    return this.get(`${CACHE_KEYS.PRODUCT_LIST}${queryHash}`);
  }

  /**
   * Set product list in cache
   * @param {string} queryHash - Hash of query parameters
   * @param {Object} data - List data with pagination
   * @param {number} ttl - TTL in seconds
   */
  async setProductList(queryHash, data, ttl = 300) {
    return this.set(`${CACHE_KEYS.PRODUCT_LIST}${queryHash}`, data, ttl);
  }

  /**
   * Get search results from cache
   * @param {string} searchHash - Hash of search parameters
   */
  async getSearchResults(searchHash) {
    return this.get(`${CACHE_KEYS.PRODUCT_SEARCH}${searchHash}`);
  }

  /**
   * Set search results in cache
   * @param {string} searchHash - Hash of search parameters
   * @param {Object} data - Search results
   * @param {number} ttl - TTL in seconds
   */
  async setSearchResults(searchHash, data, ttl = 300) {
    return this.set(`${CACHE_KEYS.PRODUCT_SEARCH}${searchHash}`, data, ttl);
  }

  // ==================== Category Cache Methods ====================

  /**
   * Get category from cache
   * @param {number} id - Category ID
   */
  async getCategory(id) {
    return this.get(`${CACHE_KEYS.CATEGORY}${id}`);
  }

  /**
   * Set category in cache
   * @param {number} id - Category ID
   * @param {Object} category - Category data
   * @param {number} ttl - TTL in seconds
   */
  async setCategory(id, category, ttl = DEFAULT_TTL) {
    return this.set(`${CACHE_KEYS.CATEGORY}${id}`, category, ttl);
  }

  /**
   * Delete category from cache
   * @param {number} id - Category ID
   */
  async delCategory(id) {
    return this.del(`${CACHE_KEYS.CATEGORY}${id}`);
  }

  /**
   * Invalidate all category-related cache
   */
  async invalidateCategoryCache() {
    await this.delByPattern(`${CACHE_KEYS.CATEGORY}*`);
    await this.delByPattern(`${CACHE_KEYS.CATEGORY_LIST}*`);
  }

  // ==================== Utility Methods ====================

  /**
   * Generate hash from object for cache key
   * @param {Object} obj - Object to hash
   * @returns {string} Hash string
   */
  generateHash(obj) {
    return Buffer.from(JSON.stringify(obj)).toString('base64');
  }
}

module.exports = new CacheService();