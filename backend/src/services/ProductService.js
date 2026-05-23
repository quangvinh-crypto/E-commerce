const mongoose = require('mongoose');
const { Product, Category, Review } = require('../models');
const { deleteImage } = require('../config/cloudinary');
const SearchService = require('./SearchService');
const ProductVariantService = require('./product/ProductVariantService');
const ProductMediaService = require('./product/ProductMediaService');

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
    const { name, description, price, quantity, categoryId, isActive, specifications, variants } = productData;
    const parsedSpecifications = this.parseSpecifications(specifications);
    let parsedVariants = this.parseVariants(variants);

    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) throw new Error('Category not found');
    }

    const productImageFiles = (files || []).filter((file) => file.fieldname === 'images');
    const images = await ProductMediaService.uploadImages(productImageFiles);

    if (!parsedVariants || parsedVariants.length === 0) {
      parsedVariants = ProductVariantService.buildDefaultVariant({ price, quantity, images });
    } else {
      parsedVariants = await ProductVariantService.attachVariantImages(parsedVariants, files, (groupFiles) =>
        ProductMediaService.uploadImages(groupFiles)
      );
    }
    const aggregate = ProductVariantService.calculateAggregateFromVariants(parsedVariants, { price, quantity });
    const representativeImages = ProductVariantService.extractRepresentativeImages(parsedVariants, images);

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
      const newImages = await ProductMediaService.uploadImages(productImageFiles);
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
      product.variants = await ProductVariantService.attachVariantImages(parsedVariants, files, (groupFiles) =>
        ProductMediaService.uploadImages(groupFiles)
      );
    }

    if ((!product.variants || product.variants.length === 0) && (price !== undefined || quantity !== undefined)) {
      product.variants = ProductVariantService.buildDefaultVariant({
        price: price !== undefined ? price : product.price,
        quantity: quantity !== undefined ? quantity : product.quantity,
        images: product.images,
      });
    }

    const aggregate = ProductVariantService.calculateAggregateFromVariants(product.variants, {
      price: price !== undefined ? price : product.price,
      quantity: quantity !== undefined ? quantity : product.quantity,
    });
    product.price = aggregate.price;
    product.quantity = aggregate.quantity;
    product.images = ProductVariantService.extractRepresentativeImages(product.variants, product.images);

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

}

module.exports = new ProductService();
