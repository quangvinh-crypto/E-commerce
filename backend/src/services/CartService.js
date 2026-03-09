const { Product } = require('../models');
const { getRedisClient, isRedisConnected } = require('../config/redis');
const mongoose = require('mongoose');

class CartService {
  getPrefix() {
    return process.env.REDIS_KEY_PREFIX || 'ecommerce';
  }

  getTtlSeconds() {
    const parsed = parseInt(process.env.REDIS_CART_TTL || '2592000', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 2592000;
  }

  ensureRedisAvailable() {
    if (!isRedisConnected()) {
      const error = new Error('Cart service is temporarily unavailable');
      error.statusCode = 503;
      throw error;
    }
  }

  buildUserCartKey(userId) {
    return `${this.getPrefix()}:cart:user:${String(userId)}`;
  }

  normalizeProductId(productId) {
    return String(productId || '').trim();
  }

  normalizeQuantity(quantity) {
    const parsed = parseInt(quantity, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      const error = new Error('Quantity must be a positive integer');
      error.statusCode = 400;
      throw error;
    }

    return Math.min(parsed, 999);
  }

  async readCart(key) {
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

  async writeCart(key, cartItems) {
    const client = getRedisClient();
    const ttl = this.getTtlSeconds();
    await client.set(key, JSON.stringify(cartItems), 'EX', ttl);
  }

  mapProductToCartItem(product, quantity = 1, existing = {}) {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      discount_price: existing.discount_price || null,
      image_url: product.images?.[0]?.url || existing.image_url || '',
      images: Array.isArray(product.images) ? product.images : [],
      quantity,
      updatedAt: new Date().toISOString(),
    };
  }

  async hydrateAndCleanCart(cartItems = []) {
    if (!Array.isArray(cartItems) || cartItems.length === 0) return [];

    const uniqueIds = [...new Set(
      cartItems
        .map((item) => this.normalizeProductId(item.id))
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    )];
    if (uniqueIds.length === 0) return [];

    const products = await Product.find({ _id: { $in: uniqueIds } }).select('name price images isActive');
    const productMap = new Map(products.filter((p) => p.isActive).map((p) => [String(p.id), p]));

    const cleaned = [];
    for (const item of cartItems) {
      const productId = this.normalizeProductId(item.id);
      if (!productId) continue;
      const product = productMap.get(productId);
      if (!product) continue;

      let quantity;
      try {
        quantity = this.normalizeQuantity(item.quantity || 1);
      } catch (_) {
        quantity = 1;
      }

      cleaned.push(this.mapProductToCartItem(product, quantity, item));
    }

    return cleaned;
  }

  async getCart(userId) {
    this.ensureRedisAvailable();

    const key = this.buildUserCartKey(userId);
    const cartItems = await this.readCart(key);
    const cleaned = await this.hydrateAndCleanCart(cartItems);

    if (JSON.stringify(cleaned) !== JSON.stringify(cartItems)) {
      await this.writeCart(key, cleaned);
    }

    return cleaned;
  }

  async addItem(userId, productId, quantity = 1) {
    this.ensureRedisAvailable();

    const key = this.buildUserCartKey(userId);
    const cartItems = await this.getCart(userId);
    const normalizedProductId = this.normalizeProductId(productId);
    const addQuantity = this.normalizeQuantity(quantity);

    const product = await Product.findById(normalizedProductId).select('name price images isActive');
    if (!product || !product.isActive) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const index = cartItems.findIndex((item) => String(item.id) === normalizedProductId);
    if (index >= 0) {
      const nextQuantity = this.normalizeQuantity((cartItems[index].quantity || 0) + addQuantity);
      cartItems[index] = this.mapProductToCartItem(product, nextQuantity, cartItems[index]);
    } else {
      cartItems.push(this.mapProductToCartItem(product, addQuantity));
    }

    await this.writeCart(key, cartItems);
    return cartItems;
  }

  async updateItemQuantity(userId, productId, quantity) {
    this.ensureRedisAvailable();

    const key = this.buildUserCartKey(userId);
    const cartItems = await this.getCart(userId);
    const normalizedProductId = this.normalizeProductId(productId);

    if (quantity <= 0) {
      const filtered = cartItems.filter((item) => String(item.id) !== normalizedProductId);
      await this.writeCart(key, filtered);
      return filtered;
    }

    const nextQuantity = this.normalizeQuantity(quantity);
    const index = cartItems.findIndex((item) => String(item.id) === normalizedProductId);
    if (index < 0) {
      const error = new Error('Cart item not found');
      error.statusCode = 404;
      throw error;
    }

    const product = await Product.findById(normalizedProductId).select('name price images isActive');
    if (!product || !product.isActive) {
      const filtered = cartItems.filter((item) => String(item.id) !== normalizedProductId);
      await this.writeCart(key, filtered);
      return filtered;
    }

    cartItems[index] = this.mapProductToCartItem(product, nextQuantity, cartItems[index]);

    await this.writeCart(key, cartItems);
    return cartItems;
  }

  async removeItem(userId, productId) {
    this.ensureRedisAvailable();

    const key = this.buildUserCartKey(userId);
    const cartItems = await this.getCart(userId);
    const normalizedProductId = this.normalizeProductId(productId);
    const filtered = cartItems.filter((item) => String(item.id) !== normalizedProductId);

    await this.writeCart(key, filtered);
    return filtered;
  }

  async clearCart(userId) {
    this.ensureRedisAvailable();

    const client = getRedisClient();
    const key = this.buildUserCartKey(userId);
    await client.del(key);
    return [];
  }

  async removeProductFromAllCarts(productId) {
    this.ensureRedisAvailable();

    const client = getRedisClient();
    const normalizedProductId = this.normalizeProductId(productId);
    const pattern = `${this.getPrefix()}:cart:user:*`;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      for (const key of keys || []) {
        const cartItems = await this.readCart(key);
        const filtered = cartItems.filter((item) => String(item.id) !== normalizedProductId);
        if (filtered.length !== cartItems.length) {
          await this.writeCart(key, filtered);
        }
      }
    } while (cursor !== '0');
  }
}

module.exports = new CartService();
