const express = require('express');
const { body, param } = require('express-validator');
const ReviewController = require('../controllers/ReviewController');
const { auth, isStaff } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const reviewIdValidation = [
  param('id').isMongoId().withMessage('Review ID must be a valid MongoDB ObjectId'),
  validate,
];

const upsertReviewValidation = [
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Comment is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters'),
  body('rating')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  body('parentId')
    .optional()
    .isMongoId()
    .withMessage('Parent review ID must be a valid MongoDB ObjectId'),
  validate,
];

const updateReviewValidation = [
  body('comment')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Comment cannot be empty')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  validate,
];

const visibilityValidation = [
  body('isVisible').isBoolean().withMessage('isVisible must be a boolean value'),
  validate,
];

router.get('/manage', auth, isStaff, ReviewController.getReviewsForModeration);
router.put('/:id', auth, reviewIdValidation, updateReviewValidation, ReviewController.updateReview);
router.delete('/:id', auth, reviewIdValidation, ReviewController.deleteReview);
router.patch(
  '/:id/visibility',
  auth,
  isStaff,
  reviewIdValidation,
  visibilityValidation,
  ReviewController.setReviewVisibility
);

module.exports = {
  reviewRouter: router,
  upsertReviewValidation,
};
