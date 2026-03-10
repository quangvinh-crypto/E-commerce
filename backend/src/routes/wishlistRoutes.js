const express = require('express');
const { body, param } = require('express-validator');
const WishlistController = require('../controllers/WishlistController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const addWishlistItemValidation = [
  body('productId')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  validate,
];

const productIdParamValidation = [
  param('productId')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  validate,
];

router.get('/', auth, WishlistController.getMyWishlist);
router.post('/items', auth, addWishlistItemValidation, WishlistController.addToWishlist);
router.delete('/items/:productId', auth, productIdParamValidation, WishlistController.removeWishlistItem);
router.delete('/', auth, WishlistController.clearMyWishlist);

module.exports = router;
