const express = require('express');
const router = express.Router();
const CacheService = require('../services/CacheService');
const { isRedisConnected } = require('../config/redis');
const { auth, isStaff } = require('../middleware/auth');

/**
 * Get cache status and stats
 * @route GET /api/cache/stats
 * @access Staff, Admin
 */
router.get('/stats', auth, isStaff, async (req, res, next) => {
  try {
    const stats = await CacheService.getStats();
    
    res.status(200).json({
      success: true,
      message: 'Cache statistics retrieved',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Clear all cache
 * @route DELETE /api/cache/all
 * @access Staff, Admin
 */
router.delete('/all', auth, isStaff, async (req, res, next) => {
  try {
    const result = await CacheService.clearAll();
    
    res.status(200).json({
      success: result,
      message: result ? 'All cache cleared' : 'Failed to clear cache',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Clear product cache
 * @route DELETE /api/cache/products
 * @access Staff, Admin
 */
router.delete('/products', auth, isStaff, async (req, res, next) => {
  try {
    await CacheService.invalidateProductCache();
    
    res.status(200).json({
      success: true,
      message: 'Product cache cleared',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Clear specific product cache
 * @route DELETE /api/cache/products/:id
 * @access Staff, Admin
 */
router.delete('/products/:id', auth, isStaff, async (req, res, next) => {
  try {
    const { id } = req.params;
    await CacheService.delProduct(id);
    
    res.status(200).json({
      success: true,
      message: `Cache for product ${id} cleared`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Clear category cache
 * @route DELETE /api/cache/categories
 * @access Staff, Admin
 */
router.delete('/categories', auth, isStaff, async (req, res, next) => {
  try {
    await CacheService.invalidateCategoryCache();
    
    res.status(200).json({
      success: true,
      message: 'Category cache cleared',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Health check for Redis
 * @route GET /api/cache/health
 */
router.get('/health', (req, res) => {
  const connected = isRedisConnected();
  
  res.status(connected ? 200 : 503).json({
    success: connected,
    message: connected ? 'Redis is connected' : 'Redis is disconnected',
    status: connected ? 'healthy' : 'unhealthy',
  });
});

module.exports = router;