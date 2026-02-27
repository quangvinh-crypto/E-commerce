const CategoryService = require('../services/CategoryService');

/**
 * Get all categories
 * @route GET /api/categories
 */
const getAllCategories = async (req, res, next) => {
  try {
    const { search, includeProducts, page, limit, sortBy, sortOrder } = req.query;

    const filters = {
      search,
      includeProducts: includeProducts === 'true',
    };

    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'DESC',
    };

    const result = await CategoryService.getAllCategories(filters, options);

    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: result.categories,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category by ID
 * @route GET /api/categories/:id
 */
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { includeProducts } = req.query;

    const options = {
      includeProducts: includeProducts === 'true',
    };

    const category = await CategoryService.getCategoryById(id, options);

    res.status(200).json({
      success: true,
      message: 'Category retrieved successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new category
 * @route POST /api/categories
 */
const createCategory = async (req, res, next) => {
  try {
    const categoryData = req.body;

    const category = await CategoryService.createCategory(categoryData);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 * @route PUT /api/categories/:id
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const category = await CategoryService.updateCategory(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category
 * @route DELETE /api/categories/:id
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    const result = await CategoryService.deleteCategory(
      id,
      force === 'true'
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.deletedCategory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category statistics
 * @route GET /api/categories/:id/stats
 */
const getCategoryStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stats = await CategoryService.getCategoryStats(id);

    res.status(200).json({
      success: true,
      message: 'Category statistics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
};
