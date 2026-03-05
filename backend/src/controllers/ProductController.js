const ProductService = require('../services/ProductService');
const CacheService = require('../services/CacheService');

const PRODUCT_CACHE_SCOPES_TO_INVALIDATE = [
  'products:list',
  'products:detail',
  'products:reviews',
  'search:list',
  'search:suggest',
];

class ProductController {
  /**
   * Get all products
   * @route GET /api/products
   */
  async getAllProducts(req, res, next) {
    try {
      const {
        categoryId,
        search,
        minPrice,
        maxPrice,
        isActive,
        includeCategory,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const filters = {
        categoryId: categoryId || undefined,
        search,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        includeCategory: includeCategory !== 'false',
      };

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'DESC',
      };

      const result = await ProductService.getAllProducts(filters, options);

      res.status(200).json({
        success: true,
        message: 'Products retrieved successfully',
        data: result.products,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by ID
   * @route GET /api/products/:id
   */
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const { includeCategory } = req.query;

      const options = {
        includeCategory: includeCategory !== 'false',
      };

      const product = await ProductService.getProductById(id, options);

      res.status(200).json({
        success: true,
        message: 'Product retrieved successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by slug
   * @route GET /api/products/slug/:slug
   */
  async getProductBySlug(req, res, next) {
    try {
      const { slug } = req.params;

      const product = await ProductService.getProductBySlug(slug);

      res.status(200).json({
        success: true,
        message: 'Product retrieved successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new product with images
   * @route POST /api/products
   */
  async createProduct(req, res, next) {
    try {
      const productData = req.body;
      const files = req.files || []; // From multer middleware

      const product = await ProductService.createProduct(productData, files);
      await CacheService.invalidateScopes(PRODUCT_CACHE_SCOPES_TO_INVALIDATE);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product with optional new images
   * @route PUT /api/products/:id
   */
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const files = req.files || []; // From multer middleware

      const product = await ProductService.updateProduct(
        id,
        updateData,
        files
      );
      await CacheService.invalidateScopes(PRODUCT_CACHE_SCOPES_TO_INVALIDATE);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product
   * @route DELETE /api/products/:id
   */
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;

      const result = await ProductService.deleteProduct(id);
      await CacheService.invalidateScopes(PRODUCT_CACHE_SCOPES_TO_INVALIDATE);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.deletedProduct,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a single image from product
   * @route DELETE /api/products/:id/images/:publicId
   */
  async deleteProductImage(req, res, next) {
    try {
      const { id, publicId } = req.params;
      const decodedPublicId = decodeURIComponent(publicId);

      const product = await ProductService.deleteProductImage(
        id,
        decodedPublicId
      );
      await CacheService.invalidateScopes(PRODUCT_CACHE_SCOPES_TO_INVALIDATE);

      res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
