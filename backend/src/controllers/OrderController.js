const OrderService = require('../services/OrderService');

class OrderController {
  /**
   * Create new order
   * @route POST /api/orders
   */
  async createOrder(req, res, next) {
    try {
      const userId = req.user.id;
      const orderData = req.body;

      const order = await OrderService.createOrder(userId, orderData);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my orders
   * @route GET /api/orders/my
   */
  async getMyOrders(req, res, next) {
    try {
      const userId = req.user.id;
      const { status, paymentStatus, page, limit, sortBy, sortOrder } = req.query;

      const filters = {
        status,
        paymentStatus,
      };

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'DESC',
      };

      const result = await OrderService.getMyOrders(userId, filters, options);

      res.status(200).json({
        success: true,
        message: 'Orders retrieved successfully',
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order by ID
   * @route GET /api/orders/:id
   */
  async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const order = await OrderService.getOrderById(id, userId, userRole);

      res.status(200).json({
        success: true,
        message: 'Order retrieved successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel order
   * @route PUT /api/orders/:id/cancel
   */
  async cancelOrder(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { reason } = req.body;

      const order = await OrderService.cancelOrder(id, userId, reason);

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update order status (Staff/Admin only)
   * @route PUT /api/orders/:id/status
   */
  async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, trackingNumber, shippingCarrier } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required',
        });
      }

      const order = await OrderService.updateOrderStatus(
        id,
        status,
        trackingNumber,
        shippingCarrier
      );

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all orders (Staff/Admin only)
   * @route GET /api/orders
   */
  async getAllOrders(req, res, next) {
    try {
      const { status, paymentStatus, userId, page, limit, sortBy, sortOrder } = req.query;

      const { Order } = require('../models');
      const whereClause = {};

      if (status) whereClause.status = status;
      if (paymentStatus) whereClause.paymentStatus = paymentStatus;
      if (userId) whereClause.userId = userId;

      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 10;
      const sortField = sortBy || 'createdAt';
      const sortDirection = (sortOrder || 'DESC').toUpperCase() === 'ASC' ? 1 : -1;

      const [count, rows] = await Promise.all([
        Order.countDocuments(whereClause),
        Order.find(whereClause)
          .sort({ [sortField]: sortDirection })
          .skip((parsedPage - 1) * parsedLimit)
          .limit(parsedLimit)
          .populate({ path: 'items', select: 'productId variantId variantColor variantStorage productName productImage price quantity subtotal total' })
          .populate({ path: 'user', select: 'name email' }),
      ]);

      res.status(200).json({
        success: true,
        message: 'Orders retrieved successfully',
        data: rows,
        pagination: {
          total: count,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(count / parsedLimit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();
