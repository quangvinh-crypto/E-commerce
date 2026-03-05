const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/CategoryController');
const cacheResponse = require('../middleware/cacheResponse');
const { auth, isStaff } = require('../middleware/auth');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');

// Validation middleware
const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim(),
  validate,
];

const updateCategoryValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim(),
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
  cacheResponse({ scope: 'categories:list', ttlSeconds: 300 }),
  CategoryController.getAllCategories
);
router.get(
  '/:id',
  cacheResponse({ scope: 'categories:detail', ttlSeconds: 300, payloadBuilder: (req) => ({ id: req.params.id, query: req.query }) }),
  idParamValidation,
  CategoryController.getCategoryById
);

// ============================================
// STAFF & ADMIN ROUTES - Quản lý categories
// ============================================
router.post('/', auth, isStaff, createCategoryValidation, CategoryController.createCategory);
router.put('/:id', auth, isStaff, idParamValidation, updateCategoryValidation, CategoryController.updateCategory);
router.delete('/:id', auth, isStaff, idParamValidation, CategoryController.deleteCategory);

module.exports = router;
