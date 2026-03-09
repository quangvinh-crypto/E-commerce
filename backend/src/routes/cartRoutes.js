const express = require('express');
const { body, param } = require('express-validator');
const CartController = require('../controllers/CartController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const upsertCartItemValidation = [
  body('productId')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  validate,
];

const updateCartItemValidation = [
  param('productId')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  validate,
];

const productIdParamValidation = [
  param('productId')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  validate,
];

router.get('/', auth, CartController.getMyCart);
router.post('/items', auth, upsertCartItemValidation, CartController.addToCart);
router.patch('/items/:productId', auth, updateCartItemValidation, CartController.updateCartItem);
router.delete('/items/:productId', auth, productIdParamValidation, CartController.removeCartItem);
router.delete('/', auth, CartController.clearMyCart);

module.exports = router;
