const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { uploadMultiple, handleMulterError } = require('../middleware/upload');
const { auth, isStaff } = require('../middleware/auth');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');

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
router.get('/', ProductController.getAllProducts);
router.get('/:id', idParamValidation, ProductController.getProductById);

// ============================================
// STAFF & ADMIN ROUTES - Quản lý sản phẩm
// ============================================
router.post('/', auth, isStaff, uploadMultiple, handleMulterError, createProductValidation, ProductController.createProduct);
router.put('/:id', auth, isStaff, uploadMultiple, handleMulterError, idParamValidation, updateProductValidation, ProductController.updateProduct);
router.delete('/:id', auth, isStaff, idParamValidation, ProductController.deleteProduct);
router.delete('/:id/images/:publicId(*)', auth, isStaff, idParamValidation, ProductController.deleteProductImage);

module.exports = router;
