const { Product } = require('../models');
const { getRedisClient, isRedisConnected } = require('../config/redis');
const mongoose = require('mongoose');

class WishlistService {
  getPrefix() {
    return process.env.REDIS_KEY_PREFIX || 'ecommerce';
  }

  getTtlSeconds() {
    const parsed = parseInt(process.env.REDIS_WISHLIST_TTL || '2592000', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 2592000;
  }

  ensureRedisAvailable() {
    if (!isRedisConnected()) {
      const error = new Error('Wishlist service is temporarily unavailable');
      error.statusCode = 503;
      throw error;
    }
  }

  buildUserWishlistKey(userId) {
    return `${this.getPrefix()}:wishlist:user:${String(userId)}`;
  }

  normalizeProductId(productId) {
    return String(productId || '').trim();
  }

  async readWishlist(key) {
    const client = getRedisClient();
    const raw = await client.get(key);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  async writeWishlist(key, wishlistItems) {
    const client = getRedisClient();
    const ttl = this.getTtlSeconds();
    await client.set(key, JSON.stringify(wishlistItems), 'EX', ttl);
  }

  mapProductToWishlistItem(product, existing = {}) {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.images?.[0]?.url || existing.image_url || '',
      images: Array.isArray(product.images) ? product.images : [],
      addedAt: existing.addedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async hydrateAndCleanWishlist(wishlistItems = []) {
    if (!Array.isArray(wishlistItems) || wishlistItems.length === 0) return [];

    const uniqueIds = [...new Set(
      wishlistItems
        .map((item) => this.normalizeProductId(item.id))
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    )];
    if (uniqueIds.length === 0) return [];

    const products = await Product.find({ _id: { $in: uniqueIds } }).select('name price images isActive');
    const productMap = new Map(products.filter((p) => p.isActive).map((p) => [String(p.id), p]));

    const cleaned = [];
    for (const item of wishlistItems) {
      const productId = this.normalizeProductId(item.id);
      if (!productId) continue;
      const product = productMap.get(productId);
      if (!product) continue;

      cleaned.push(this.mapProductToWishlistItem(product, item));
    }

    return cleaned;
  }

  async getWishlist(userId) {
    this.ensureRedisAvailable();

    const key = this.buildUserWishlistKey(userId);
    const wishlistItems = await this.readWishlist(key);
    const cleaned = await this.hydrateAndCleanWishlist(wishlistItems);

    if (JSON.stringify(cleaned) !== JSON.stringify(wishlistItems)) {
      await this.writeWishlist(key, cleaned);
    }

    return cleaned;
  }

  async addItem(userId, productId) {
    this.ensureRedisAvailable();

    const key = this.buildUserWishlistKey(userId);
    const wishlistItems = await this.getWishlist(userId);
    const normalizedProductId = this.normalizeProductId(productId);

    const product = await Product.findById(normalizedProductId).select('name price images isActive');
    if (!product || !product.isActive) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const index = wishlistItems.findIndex((item) => String(item.id) === normalizedProductId);
    if (index < 0) {
      wishlistItems.push(this.mapProductToWishlistItem(product));
      await this.writeWishlist(key, wishlistItems);
    }

    return wishlistItems;
  }

  async removeItem(userId, productId) {
    this.ensureRedisAvailable();

    const key = this.buildUserWishlistKey(userId);
    const normalizedProductId = this.normalizeProductId(productId);
    const wishlistItems = await this.getWishlist(userId);
    const filtered = wishlistItems.filter((item) => String(item.id) !== normalizedProductId);

    await this.writeWishlist(key, filtered);
    return filtered;
  }

  async clearWishlist(userId) {
    this.ensureRedisAvailable();

    const client = getRedisClient();
    const key = this.buildUserWishlistKey(userId);
    await client.del(key);
    return [];
  }

  async removeProductFromAllWishlists(productId) {
    this.ensureRedisAvailable();

    const client = getRedisClient();
    const normalizedProductId = this.normalizeProductId(productId);
    const pattern = `${this.getPrefix()}:wishlist:user:*`;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      for (const key of keys || []) {
        const wishlistItems = await this.readWishlist(key);
        const filtered = wishlistItems.filter((item) => String(item.id) !== normalizedProductId);
        if (filtered.length !== wishlistItems.length) {
          await this.writeWishlist(key, filtered);
        }
      }
    } while (cursor !== '0');
  }
}

module.exports = new WishlistService();
