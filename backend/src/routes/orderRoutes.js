const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');
const { auth, isStaff } = require('../middleware/auth');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');

// Validation middleware
const createOrderValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.productId')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('shippingAddress')
    .notEmpty()
    .withMessage('Shipping address is required'),
  body('shippingAddress.name')
    .notEmpty()
    .withMessage('Shipping address name is required'),
  body('shippingAddress.phone')
    .notEmpty()
    .withMessage('Shipping address phone is required'),
  body('shippingAddress.address')
    .notEmpty()
    .withMessage('Shipping address is required'),
  body('paymentMethod')
    .optional()
    .isIn(['cod', 'credit_card', 'debit_card', 'paypal', 'bank_transfer', 'vnpay'])
    .withMessage('Invalid payment method'),
  body('couponCode')
    .optional({ nullable: true })
    .isString()
    .withMessage('Coupon code must be a string')
    .isLength({ min: 3, max: 30 })
    .withMessage('Coupon code must be between 3 and 30 characters'),
  validate,
];

const idParamValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID must be a valid MongoDB ObjectId'),
  validate,
];

const updateStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Invalid status'),
  body('trackingNumber')
    .optional({ nullable: true })
    .isString(),
  body('shippingCarrier')
    .optional({ nullable: true })
    .isString(),
  validate,
];

// ============================================
// CUSTOMER ROUTES - Authenticated users
// ============================================
router.post('/', auth, createOrderValidation, OrderController.createOrder);
router.get('/my', auth, OrderController.getMyOrders);
router.get('/:id', auth, idParamValidation, OrderController.getOrderById);
router.put('/:id/cancel', auth, idParamValidation, OrderController.cancelOrder);

// ============================================
// STAFF & ADMIN ROUTES - Order management
// ============================================
router.get('/', auth, isStaff, OrderController.getAllOrders);
router.put('/:id/status', auth, isStaff, idParamValidation, updateStatusValidation, OrderController.updateOrderStatus);

module.exports = router;
