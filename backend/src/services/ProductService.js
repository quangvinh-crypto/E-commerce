const mongoose = require('mongoose');
const { Product, Category } = require('../models');
const { deleteImage } = require('../config/cloudinary');
const CacheService = require('./CacheService');
const SearchService = require('./SearchService');

class ProductService {
  async getAllProducts(filters = {}, options = {}) {
    const cacheKey = CacheService.generateHash({ filters, options });
    const cached = await CacheService.getProductList(cacheKey);
    if (cached) return cached;

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

    await CacheService.setProductList(cacheKey, result, 300);
    return result;
  }

  async getProductById(id, options = {}) {
    const cached = await CacheService.getProduct(id);
    if (cached) return cached;

    const { includeCategory = true } = options;
    let query = Product.findById(id);
    if (includeCategory) {
      query = query.populate({ path: 'category', select: 'name description' });
    }

    const product = await query;
    if (!product) throw new Error('Product not found');

    await CacheService.setProduct(id, product.toJSON(), 3600);
    return product;
  }

  async createProduct(productData, files = []) {
    const { name, description, price, quantity, categoryId, isActive, specifications } = productData;

    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) throw new Error('Category not found');
    }

    const images = await this.uploadImages(files);

    const product = await Product.create({
      name,
      description: description || null,
      price,
      quantity: quantity || 0,
      categoryId: categoryId || null,
      isActive: isActive !== undefined ? isActive : true,
      images,
      specifications: specifications || null,
    });

    await SearchService.indexProduct(product);
    await CacheService.delByPattern('products:list:*');
    await CacheService.delByPattern('products:search:*');

    return product;
  }

  async updateProduct(id, updateData, files = []) {
    const product = await Product.findById(id);
    if (!product) throw new Error('Product not found');

    const { name, description, price, quantity, categoryId, isActive, specifications } = updateData;

    if (categoryId !== undefined && categoryId !== String(product.categoryId) && categoryId !== null) {
      const category = await Category.findById(categoryId);
      if (!category) throw new Error('Category not found');
    }

    if (files?.length > 0) {
      const newImages = await this.uploadImages(files);
      product.images = [...(product.images || []), ...newImages];
    }

    if (name) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (quantity !== undefined) product.quantity = quantity;
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (isActive !== undefined) product.isActive = isActive;
    if (specifications !== undefined) product.specifications = specifications;

    await product.save();

    await SearchService.indexProduct(product);
    await CacheService.delProduct(id);
    await CacheService.delByPattern('products:list:*');
    await CacheService.delByPattern('products:search:*');

    return product;
  }

  async deleteProduct(id) {
    const product = await Product.findById(id);
    if (!product) throw new Error('Product not found');

    if (product.images?.length > 0) {
      await Promise.all(product.images.map((img) => img.publicId && deleteImage(img.publicId).catch(() => {})));
    }

    await product.deleteOne();

    await SearchService.removeProduct(id);
    await CacheService.delProduct(id);
    await CacheService.delByPattern('products:list:*');
    await CacheService.delByPattern('products:search:*');

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
    await CacheService.delProduct(productId);

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
}

module.exports = new ProductService();
