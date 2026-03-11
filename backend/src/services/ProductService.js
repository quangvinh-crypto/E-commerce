const mongoose = require('mongoose');
const { Product, Category, Review } = require('../models');
const { deleteImage } = require('../config/cloudinary');
const SearchService = require('./SearchService');

class ProductService {
  parseSpecifications(specifications) {
    if (specifications === undefined) return undefined;
    if (specifications === null || specifications === '') return null;

    if (typeof specifications === 'string') {
      try {
        const parsed = JSON.parse(specifications);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch (_) {
        return null;
      }
    }

    if (typeof specifications === 'object') {
      return specifications;
    }

    return null;
  }

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

  async getAllProducts(filters = {}, options = {}) {
    const { categoryId, search, minPrice, maxPrice, isActive, includeCategory = true } = filters;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = options;

    const whereClause = this.buildWhereClause({ categoryId, search, minPrice, maxPrice, isActive });
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const sortDirection = String(sortOrder).toUpperCase() === 'ASC' ? 1 : -1;

    let query = Product.find(whereClause)
      .sort({ [sortBy]: sortDirection })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    if (includeCategory) {
      query = query.populate({ path: 'category', select: 'name description' });
    }

    const [products, count] = await Promise.all([
      query,
      Product.countDocuments(whereClause),
    ]);

    const result = {
      products,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(count / parsedLimit),
      },
    };

    return result;
  }

  async getProductById(id, options = {}) {
    const { includeCategory = true } = options;
    let query = Product.findById(id);
    if (includeCategory) {
      query = query.populate({ path: 'category', select: 'name description' });
    }

    const product = await query;
    if (!product) throw new Error('Product not found');

    return product;
  }

  async createProduct(productData, files = []) {
    const { name, description, price, quantity, categoryId, isActive, specifications, variants } = productData;
    const parsedSpecifications = this.parseSpecifications(specifications);
    let parsedVariants = this.parseVariants(variants);

    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) throw new Error('Category not found');
    }

    const productImageFiles = (files || []).filter((file) => file.fieldname === 'images');
    const images = await this.uploadImages(productImageFiles);

    if (!parsedVariants || parsedVariants.length === 0) {
      parsedVariants = this.buildDefaultVariant({ price, quantity, images });
    } else {
      parsedVariants = await this.attachVariantImages(parsedVariants, files);
    }
    const aggregate = this.calculateAggregateFromVariants(parsedVariants, { price, quantity });
    const representativeImages = this.extractRepresentativeImages(parsedVariants, images);

    const product = await Product.create({
      name,
      description: description || null,
      price: aggregate.price,
      quantity: aggregate.quantity,
      categoryId: categoryId || null,
      isActive: isActive !== undefined ? isActive : true,
      images: representativeImages,
      variants: parsedVariants,
      specifications: parsedSpecifications,
    });

    await SearchService.indexProduct(product);

    return product;
  }

  async updateProduct(id, updateData, files = []) {
    const product = await Product.findById(id);
    if (!product) throw new Error('Product not found');

    const { name, description, price, quantity, categoryId, isActive, specifications, variants } = updateData;
    const parsedSpecifications = this.parseSpecifications(specifications);
    const parsedVariants = this.parseVariants(variants);

    if (categoryId !== undefined && categoryId !== String(product.categoryId) && categoryId !== null) {
      const category = await Category.findById(categoryId);
      if (!category) throw new Error('Category not found');
    }

    if (files?.length > 0) {
      const productImageFiles = files.filter((file) => file.fieldname === 'images');
      const newImages = await this.uploadImages(productImageFiles);
      product.images = [...(product.images || []), ...newImages];
    }

    if (name) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (quantity !== undefined) product.quantity = quantity;
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (isActive !== undefined) product.isActive = isActive;
    if (specifications !== undefined) product.specifications = parsedSpecifications;
    if (variants !== undefined) {
      product.variants = await this.attachVariantImages(parsedVariants, files);
    }

    if ((!product.variants || product.variants.length === 0) && (price !== undefined || quantity !== undefined)) {
      product.variants = this.buildDefaultVariant({
        price: price !== undefined ? price : product.price,
        quantity: quantity !== undefined ? quantity : product.quantity,
        images: product.images,
      });
    }

    const aggregate = this.calculateAggregateFromVariants(product.variants, {
      price: price !== undefined ? price : product.price,
      quantity: quantity !== undefined ? quantity : product.quantity,
    });
    product.price = aggregate.price;
    product.quantity = aggregate.quantity;
    product.images = this.extractRepresentativeImages(product.variants, product.images);

    await product.save();

    await SearchService.indexProduct(product);

    return product;
  }

  async deleteProduct(id) {
    const product = await Product.findById(id);
    if (!product) throw new Error('Product not found');

    if (product.images?.length > 0) {
      await Promise.all(product.images.map((img) => img.publicId && deleteImage(img.publicId).catch(() => {})));
    }

    await Review.deleteMany({ productId: product.id });

    await product.deleteOne();

    await SearchService.removeProduct(id);

    return { message: 'Product deleted successfully', deletedProduct: { id: product.id, name: product.name } };
  }

  async deleteProductImage(productId, publicId) {
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    const imageIndex = product.images?.findIndex((img) => img.publicId === publicId);
    if (imageIndex === -1) throw new Error('Image not found');

    await deleteImage(publicId);
    product.images.splice(imageIndex, 1);
    await product.save();

    await SearchService.indexProduct(product);

    return product;
  }

  buildWhereClause({ categoryId, search, minPrice, maxPrice, isActive }) {
    const where = {};

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) where.isActive = isActive;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.$gte = minPrice;
      if (maxPrice) where.price.$lte = maxPrice;
    }

    if (search) {
      where.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    return where;
  }

  async uploadImages(files) {
    if (!files?.length) return [];

    const cloudinary = require('cloudinary').v2;
    const images = [];

    for (const file of files) {
      try {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'ecommerce/products', resource_type: 'auto' },
            (error, response) => (error ? reject(error) : resolve(response))
          );
          stream.end(file.buffer);
        });

        images.push({ url: result.secure_url, publicId: result.public_id });
      } catch (error) {
        await Promise.all(images.map((img) => deleteImage(img.publicId).catch(() => {})));
        throw new Error(`Image upload failed: ${error.message}`);
      }
    }

    return images;
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

  async attachVariantImages(variants = [], files = []) {
    if (!Array.isArray(variants)) return [];

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
          const uploadedImages = await this.uploadImages(groupedFiles.get(key));
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

module.exports = new ProductService();
