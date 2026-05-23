const mongoose = require('mongoose');

class ProductVariantService {
  parseVariants(variants) {
    if (variants === undefined) return undefined;
    if (variants === null || variants === '') return [];

    let parsedVariants = variants;
    if (typeof variants === 'string') {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (_) {
        throw new Error('Variants must be a valid JSON array');
      }
    }

    if (!Array.isArray(parsedVariants)) {
      throw new Error('Variants must be an array');
    }

    const normalized = parsedVariants
      .map((variant) => ({
        _id: variant?.id || variant?._id,
        clientKey: variant?.clientKey ? String(variant.clientKey).trim() : null,
        color: String(variant?.color || '').trim(),
        colorHex: variant?.colorHex ? String(variant.colorHex).trim() : null,
        storage: String(variant?.storage || '').trim(),
        price: Number(variant?.price),
        quantity: Number.isFinite(Number(variant?.quantity)) ? Number(variant.quantity) : 0,
        sku: variant?.sku ? String(variant.sku).trim() : null,
        images: Array.isArray(variant?.images) ? variant.images : [],
        isActive: variant?.isActive !== false,
      }))
      .filter((variant) => variant.color && variant.storage);

    normalized.forEach((variant) => {
      if (variant._id && !mongoose.Types.ObjectId.isValid(String(variant._id))) {
        delete variant._id;
      }
    });

    const duplicateKey = new Set();
    for (const variant of normalized) {
      if (!Number.isFinite(variant.price) || variant.price < 0) {
        throw new Error('Variant price must be a non-negative number');
      }

      if (!Number.isFinite(variant.quantity) || variant.quantity < 0) {
        throw new Error('Variant quantity must be a non-negative number');
      }

      const combo = `${variant.color.toLowerCase()}::${variant.storage.toLowerCase()}`;
      if (duplicateKey.has(combo)) {
        throw new Error(`Duplicate variant combination: ${variant.color} / ${variant.storage}`);
      }
      duplicateKey.add(combo);
    }

    return normalized;
  }

  buildDefaultVariant({ price, quantity, images = [] }) {
    const parsedPrice = Number(price);
    const parsedQuantity = Number(quantity);

    return [
      {
        color: 'Mac dinh',
        colorHex: '#737373',
        storage: 'Mac dinh',
        price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
        quantity: Number.isFinite(parsedQuantity) ? parsedQuantity : 0,
        sku: null,
        images,
        isActive: true,
      },
    ];
  }

  calculateAggregateFromVariants(variants = [], fallback = {}) {
    if (!Array.isArray(variants) || variants.length === 0) {
      return {
        price: Number(fallback.price) || 0,
        quantity: Number(fallback.quantity) || 0,
      };
    }

    const active = variants.filter((variant) => variant.isActive !== false);
    const source = active.length > 0 ? active : variants;
    const prices = source.map((variant) => Number(variant.price)).filter((value) => Number.isFinite(value));
    const quantities = source.map((variant) => Number(variant.quantity)).filter((value) => Number.isFinite(value));

    return {
      price: prices.length > 0 ? Math.min(...prices) : Number(fallback.price) || 0,
      quantity: quantities.length > 0 ? quantities.reduce((sum, value) => sum + value, 0) : Number(fallback.quantity) || 0,
    };
  }

  extractRepresentativeImages(variants = [], fallbackImages = []) {
    if (!Array.isArray(variants) || variants.length === 0) {
      return Array.isArray(fallbackImages) ? fallbackImages : [];
    }

    const sourceVariant =
      variants.find((variant) => Array.isArray(variant.images) && variant.images.length > 0) || null;

    if (!sourceVariant) {
      return Array.isArray(fallbackImages) ? fallbackImages : [];
    }

    return sourceVariant.images.slice(0, 4);
  }

  async attachVariantImages(variants = [], files = [], uploadImages) {
    if (!Array.isArray(variants)) return [];
    if (typeof uploadImages !== 'function') {
      throw new Error('uploadImages dependency is required');
    }

    const groupedFiles = new Map();
    (files || []).forEach((file) => {
      if (!String(file.fieldname || '').startsWith('variantImages:')) return;
      const key = String(file.fieldname).replace('variantImages:', '').trim();
      if (!key) return;
      const bucket = groupedFiles.get(key) || [];
      bucket.push(file);
      groupedFiles.set(key, bucket);
    });

    const uploadedByKey = new Map();
    const normalized = [];
    for (const variant of variants) {
      const key = variant.clientKey || variant._id?.toString?.() || '';
      const next = { ...variant };
      if (key && groupedFiles.has(key)) {
        if (!uploadedByKey.has(key)) {
          const uploadedImages = await uploadImages(groupedFiles.get(key));
          uploadedByKey.set(key, uploadedImages);
        }
        next.images = uploadedByKey.get(key);
      } else if (!Array.isArray(next.images)) {
        next.images = [];
      }
      delete next.clientKey;
      normalized.push(next);
    }

    return normalized;
  }
}

module.exports = new ProductVariantService();
