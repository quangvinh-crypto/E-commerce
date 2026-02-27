const express = require('express');
const authRoutes = require('./authRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const userRoutes = require('./userRoutes');
const cacheRoutes = require('./cacheRoutes');
const searchRoutes = require('./searchRoutes');
const orderRoutes = require('./orderRoutes');
const paymentRoutes = require('./paymentRoutes');

const router = express.Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/cache', cacheRoutes);
router.use('/search', searchRoutes);
router.use('/orders', orderRoutes);
router.use('/payment', paymentRoutes);

// API Info
router.get('/', (req, res) => {
  res.json({
    message: 'Backend API with Layer Architecture',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      categories: '/api/categories',
      products: '/api/products',
      users: '/api/users (Admin only)',
      orders: '/api/orders',
      payment: '/api/payment',
      cache: '/api/cache',
      search: '/api/search',
      health: '/health'
    }
  });
});

module.exports = router;