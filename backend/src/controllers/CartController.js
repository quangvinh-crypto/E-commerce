const CartService = require('../services/CartService');

class CartController {
  async getMyCart(req, res, next) {
    try {
      const cart = await CartService.getCart(req.user.id);
      res.status(200).json({
        success: true,
        message: 'Cart retrieved successfully',
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  async addToCart(req, res, next) {
    try {
      const { productId, quantity = 1 } = req.body;
      const cart = await CartService.addItem(req.user.id, productId, quantity);

      res.status(200).json({
        success: true,
        message: 'Product added to cart',
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCartItem(req, res, next) {
    try {
      const { productId } = req.params;
      const { quantity } = req.body;
      const cart = await CartService.updateItemQuantity(req.user.id, productId, quantity);

      res.status(200).json({
        success: true,
        message: 'Cart item updated successfully',
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeCartItem(req, res, next) {
    try {
      const { productId } = req.params;
      const cart = await CartService.removeItem(req.user.id, productId);

      res.status(200).json({
        success: true,
        message: 'Cart item removed successfully',
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  async clearMyCart(req, res, next) {
    try {
      const cart = await CartService.clearCart(req.user.id);

      res.status(200).json({
        success: true,
        message: 'Cart cleared successfully',
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CartController();
