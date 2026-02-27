const express = require('express');
const router = express.Router();
const SearchService = require('../services/SearchService');
const { isESConnected } = require('../config/elasticsearch');
const { auth, isStaff } = require('../middleware/auth');

/**
 * Search products
 * @route GET /api/search
 * @access Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { q, categoryId, minPrice, maxPrice, isActive, page, limit, sortBy, sortOrder } = req.query;

    const filters = {
      categoryId: categoryId || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : true,
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

/**
 * Initialize search index
 * @route POST /api/search/init
 * @access Staff, Admin
 */
router.post('/init', auth, isStaff, async (req, res, next) => {
  try {
    const result = await SearchService.initIndex();

    res.status(200).json({
      success: result,
      message: result ? 'Index initialized' : 'Failed to initialize index',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Bulk index all products
 * @route POST /api/search/reindex
 * @access Staff, Admin
 */
router.post('/reindex', auth, isStaff, async (req, res, next) => {
  try {
    const result = await SearchService.bulkIndexProducts();

    res.status(200).json({
      success: result.success,
      message: result.success ? `Indexed ${result.indexed} products` : result.message,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Health check for OpenSearch
 * @route GET /api/search/health
 */
router.get('/health', (req, res) => {
  const connected = isESConnected();

  res.status(connected ? 200 : 503).json({
    success: connected,
    message: connected ? 'OpenSearch is connected' : 'OpenSearch is disconnected',
    status: connected ? 'healthy' : 'unhealthy',
  });
});

module.exports = router;
