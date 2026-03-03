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
    const { name, description, price, quantity, categoryId, isActive, specifications } = productData;
    const parsedSpecifications = this.parseSpecifications(specifications);

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
      specifications: parsedSpecifications,
    });

    await SearchService.indexProduct(product);

    return product;
  }

  async updateProduct(id, updateData, files = []) {
    const product = await Product.findById(id);
    if (!product) throw new Error('Product not found');

    const { name, description, price, quantity, categoryId, isActive, specifications } = updateData;
    const parsedSpecifications = this.parseSpecifications(specifications);

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
    if (specifications !== undefined) product.specifications = parsedSpecifications;

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
}

module.exports = new ProductService();
