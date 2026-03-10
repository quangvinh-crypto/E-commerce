const WishlistService = require('../services/WishlistService');

class WishlistController {
  async getMyWishlist(req, res, next) {
    try {
      const wishlist = await WishlistService.getWishlist(req.user.id);
      res.status(200).json({
        success: true,
        message: 'Wishlist retrieved successfully',
        data: wishlist,
      });
    } catch (error) {
      next(error);
    }
  }

  async addToWishlist(req, res, next) {
    try {
      const { productId } = req.body;
      const wishlist = await WishlistService.addItem(req.user.id, productId);

      res.status(200).json({
        success: true,
        message: 'Product added to wishlist',
        data: wishlist,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeWishlistItem(req, res, next) {
    try {
      const { productId } = req.params;
      const wishlist = await WishlistService.removeItem(req.user.id, productId);

      res.status(200).json({
        success: true,
        message: 'Wishlist item removed successfully',
        data: wishlist,
      });
    } catch (error) {
      next(error);
    }
  }

  async clearMyWishlist(req, res, next) {
    try {
      const wishlist = await WishlistService.clearWishlist(req.user.id);

      res.status(200).json({
        success: true,
        message: 'Wishlist cleared successfully',
        data: wishlist,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WishlistController();
