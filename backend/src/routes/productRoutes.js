const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const ReviewController = require('../controllers/ReviewController');
const { uploadMultiple, handleMulterError } = require('../middleware/upload');
const cacheResponse = require('../middleware/cacheResponse');
const { auth, isStaff, isCustomer } = require('../middleware/auth');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { upsertReviewValidation } = require('./reviewRoutes');

// Validation middleware
const createProductValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Product name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim(),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Category ID must be a valid MongoDB ObjectId'),
  validate,
];

const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Product name must be between 2 and 255 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  validate,
];

const idParamValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID must be a valid MongoDB ObjectId'),
  validate,
];

// ============================================
// PUBLIC ROUTES - Ai cũng xem được
// ============================================
router.get(
  '/',
  cacheResponse({ scope: 'products:list', ttlSeconds: 120 }),
  ProductController.getAllProducts
);
router.get(
  '/:id',
  cacheResponse({ scope: 'products:detail', ttlSeconds: 180, payloadBuilder: (req) => ({ id: req.params.id, query: req.query }) }),
  idParamValidation,
  ProductController.getProductById
);
router.get(
  '/:id/reviews',
  cacheResponse({ scope: 'products:reviews', ttlSeconds: 60, payloadBuilder: (req) => ({ id: req.params.id, query: req.query }) }),
  idParamValidation,
  ReviewController.getProductReviews
);
router.post('/:id/reviews', auth, isCustomer, idParamValidation, upsertReviewValidation, ReviewController.createProductReview);

// ============================================
// STAFF & ADMIN ROUTES - Quản lý sản phẩm
// ============================================
router.post('/', auth, isStaff, uploadMultiple, handleMulterError, createProductValidation, ProductController.createProduct);
router.put('/:id', auth, isStaff, uploadMultiple, handleMulterError, idParamValidation, updateProductValidation, ProductController.updateProduct);
router.delete('/:id', auth, isStaff, idParamValidation, ProductController.deleteProduct);
router.delete('/:id/images/:publicId(*)', auth, isStaff, idParamValidation, ProductController.deleteProductImage);

module.exports = router;
