const express = require('express');
const router = express.Router();
const SearchService = require('../services/SearchService');

/**
 * Search products
 * @route GET /api/search
 * @access Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { q, categoryId, minPrice, maxPrice, isActive, page, limit, sortBy, sortOrder } = req.query;
    const parsedIsActive =
      isActive === undefined || isActive === '' ? undefined : String(isActive).toLowerCase() === 'true';

    const filters = {
      categoryId: categoryId || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      isActive: parsedIsActive,
    };

    const options = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      sortBy: sortBy || '_score',
      sortOrder: sortOrder || 'desc',
    };

    const result = await SearchService.search(q, filters, options);

    res.status(200).json({
      success: true,
      message: 'Search completed',
      data: result.products || [],
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get search suggestions
 * @route GET /api/search/suggest
 */
router.get('/suggest', async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const suggestions = await SearchService.suggest(q, limit ? parseInt(limit) : 10);

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
