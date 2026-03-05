const { Order, OrderItem, Product } = require('../models');
const CouponService = require('./CouponService');

class OrderService {
  generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  async createOrder(userId, orderData) {
    const {
      items,
      shippingAddress,
      shipping_address,
      billingAddress,
      billing_address,
      paymentMethod,
      payment_method,
      notes,
      shippingFee,
      shipping_fee,
      tax = 0,
      couponCode,
    } = orderData;

    const finalShippingAddress = shippingAddress || shipping_address;
    const finalPaymentMethod = paymentMethod || payment_method || 'cod';
    const finalShippingFee = shippingFee ?? shipping_fee ?? 0;
    const finalBillingAddress = billingAddress || billing_address;

    const transformedItems = (items || []).map((item) => ({
      productId: item.productId || item.product_id,
      quantity: item.quantity,
    }));

    if (!transformedItems.length) {
      throw new Error('Order must have at least one item');
    }

    if (!finalShippingAddress) {
      throw new Error('Shipping address is required');
    }

    let subtotal = 0;
    const orderItemsData = [];

    for (const item of transformedItems) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      if (!product.isActive) {
        throw new Error(`Product ${product.name} is not available`);
      }

      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`);
      }

      const itemPrice = parseFloat(product.price);
      const itemSubtotal = itemPrice * item.quantity;
      subtotal += itemSubtotal;

      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        productImage: product.images?.[0]?.url || null,
        price: itemPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        discount: 0,
        total: itemSubtotal,
      });
    }

    const normalizedShippingFee = Number(finalShippingFee) || 0;
    const normalizedTax = Number(tax) || 0;
    let discount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const couponValidation = await CouponService.validateCouponForUser(userId, couponCode, subtotal);
      discount = couponValidation.discountAmount;
      appliedCoupon = {
        couponId: couponValidation.coupon.id,
        code: couponValidation.coupon.code,
        discountType: couponValidation.coupon.discountType,
        discountValue: couponValidation.coupon.discountValue,
      };
    }

    const total = Math.max(0, subtotal + normalizedShippingFee + normalizedTax - discount);

    const orderPayload = {
      orderNumber: this.generateOrderNumber(),
      userId,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: finalPaymentMethod,
      subtotal,
      tax: normalizedTax,
      shippingFee: normalizedShippingFee,
      discount,
      total,
      shippingAddress: finalShippingAddress,
      billingAddress: finalBillingAddress || finalShippingAddress,
      notes: notes || null,
      ...(appliedCoupon ? { coupon: appliedCoupon } : {}),
    };

    const order = await Order.create(orderPayload);

    for (const itemData of orderItemsData) {
      await OrderItem.create({
        orderId: order.id,
        ...itemData,
      });

      const product = await Product.findById(itemData.productId);
      product.quantity -= itemData.quantity;
      await product.save();
    }

    return this.getOrderById(order.id, userId);
  }

  async getMyOrders(userId, filters = {}, options = {}) {
    const { status, paymentStatus, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = { ...filters, ...options };

    const whereClause = { userId };
    if (status) whereClause.status = status;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const sortDirection = String(sortOrder).toUpperCase() === 'ASC' ? 1 : -1;

    const [rows, count] = await Promise.all([
      Order.find(whereClause)
        .sort({ [sortBy]: sortDirection })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .populate({ path: 'items', select: 'productId productName productImage price quantity subtotal total' }),
      Order.countDocuments(whereClause),
    ]);

    return {
      orders: rows,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(count / parsedLimit),
      },
    };
  }

  async getOrderById(orderId, userId, userRole = 'customer') {
    const whereClause = { _id: orderId };
    if (userRole === 'customer') {
      whereClause.userId = userId;
    }

    const order = await Order.findOne(whereClause)
      .populate({ path: 'items', select: 'productId productName productImage price quantity subtotal total' })
      .populate({ path: 'user', select: 'name email' });

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  async cancelOrder(orderId, userId, reason = null) {
    const order = await Order.findOne({ _id: orderId, userId }).populate({ path: 'items' });
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending') {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }

    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }
    }

    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledAt = new Date();
    await order.save();

    return order;
  }

  async updateOrderStatus(orderId, status, trackingNumber = null, shippingCarrier = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    order.status = status;

    if (status === 'shipped' && !order.shippedAt) {
      order.shippedAt = new Date();
      order.trackingNumber = trackingNumber || order.trackingNumber;
      order.shippingCarrier = shippingCarrier || order.shippingCarrier;
    }

    if (status === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date();
      if (order.paymentStatus === 'pending') {
        order.paymentStatus = 'paid';
        order.paidAt = new Date();
      }
    }

    await order.save();
    return order;
  }
}

module.exports = new OrderService();
