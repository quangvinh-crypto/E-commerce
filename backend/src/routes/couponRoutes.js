const express = require('express');
const { body, query, param } = require('express-validator');
const CouponController = require('../controllers/CouponController');
const { auth, isStaff } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const createCouponValidation = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Coupon code must be between 3 and 30 characters'),
  body('description')
    .optional({ nullable: true })
    .isString(),
  body('discountType')
    .notEmpty()
    .withMessage('Discount type is required')
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be percentage or fixed'),
  body('discountValue')
    .isFloat({ gt: 0 })
    .withMessage('Discount value must be greater than 0'),
  body('maxDiscountAmount')
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage('Max discount amount must be greater than 0'),
  body('minOrderAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min order amount must be at least 0'),
  body('startsAt')
    .optional()
    .isISO8601()
    .withMessage('startsAt must be a valid ISO8601 date'),
  body('expiresAt')
    .notEmpty()
    .withMessage('expiresAt is required')
    .isISO8601()
    .withMessage('expiresAt must be a valid ISO8601 date'),
  body('usageLimit')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Usage limit must be at least 1'),
  body('perUserLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Per user limit must be at least 1'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  validate,
];

const validateCouponValidation = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required'),
  body('subtotal')
    .isFloat({ min: 0 })
    .withMessage('Subtotal must be a non-negative number'),
  validate,
];

const getCouponsValidation = [
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be true or false'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate,
];

const updateCouponValidation = [
  param('id')
    .isMongoId()
    .withMessage('Coupon id is invalid'),
  body('code')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Coupon code must be between 3 and 30 characters'),
  body('discountType')
    .optional()
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be percentage or fixed'),
  body('discountValue')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Discount value must be greater than 0'),
  body('maxDiscountAmount')
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage('Max discount amount must be greater than 0'),
  body('minOrderAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Min order amount must be at least 0'),
  body('startsAt')
    .optional()
    .isISO8601()
    .withMessage('startsAt must be a valid ISO8601 date'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('expiresAt must be a valid ISO8601 date'),
  body('usageLimit')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Usage limit must be at least 1'),
  body('perUserLimit')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Per user limit must be at least 1'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  validate,
];

const couponIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Coupon id is invalid'),
  validate,
];

router.post('/validate', auth, validateCouponValidation, CouponController.validateCoupon);

router.get('/', auth, isStaff, getCouponsValidation, CouponController.getCoupons);
router.post('/', auth, isStaff, createCouponValidation, CouponController.createCoupon);
router.put('/:id', auth, isStaff, updateCouponValidation, CouponController.updateCoupon);
router.delete('/:id', auth, isStaff, couponIdValidation, CouponController.deleteCoupon);

module.exports = router;
