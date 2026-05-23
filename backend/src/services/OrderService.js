const { Order, OrderItem, Product } = require('../models');
const CouponService = require('./CouponService');
const OrderInventoryService = require('./order/OrderInventoryService');

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
      variantId: item.variantId || item.variant_id || null,
      quantity: Number(item.quantity),
    }));

    if (!transformedItems.length) {
      throw new Error('Order must have at least one item');
    }

    if (!finalShippingAddress) {
      throw new Error('Shipping address is required');
    }

    const uniqueProductIds = Array.from(
      new Set(transformedItems.map((item) => String(item.productId || '')).filter(Boolean))
    );

    const products = await Product.find({ _id: { $in: uniqueProductIds } });
    const productMap = new Map(products.map((product) => [String(product.id), product]));

    const requiredQtyByVariant = new Map();
    transformedItems.forEach((item) => {
      const key = `${String(item.productId || '')}::${String(item.variantId || '')}`;
      const current = requiredQtyByVariant.get(key) || 0;
      requiredQtyByVariant.set(key, current + (Number.isFinite(item.quantity) ? item.quantity : 0));
    });

    let subtotal = 0;
    const orderItemsData = [];

    for (const item of transformedItems) {
      const product = productMap.get(String(item.productId));
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${product.name}`);
      }

      if (!product.isActive) {
        throw new Error(`Product ${product.name} is not available`);
      }

      const selectedVariant = OrderInventoryService.findSelectedVariant(product, item.variantId);
      if (item.variantId && !selectedVariant) {
        throw new Error(`Variant not found for ${product.name}`);
      }

      const stockKey = `${String(item.productId || '')}::${String(selectedVariant?._id || item.variantId || '')}`;
      const totalRequired = requiredQtyByVariant.get(stockKey) || 0;
      const availableStock = selectedVariant ? Number(selectedVariant.quantity || 0) : Number(product.quantity || 0);
      if (availableStock < totalRequired) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${totalRequired}`);
      }

      const itemPrice = parseFloat(selectedVariant?.price ?? product.price);
      const itemSubtotal = itemPrice * item.quantity;
      subtotal += itemSubtotal;

      orderItemsData.push({
        productId: product.id,
        variantId: selectedVariant?._id || null,
        variantColor: selectedVariant?.color || null,
        variantStorage: selectedVariant?.storage || null,
        variantSku: selectedVariant?.sku || null,
        productName: product.name,
        productImage: selectedVariant?.images?.[0]?.url || product.images?.[0]?.url || null,
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

    await OrderItem.insertMany(
      orderItemsData.map((itemData) => ({
        orderId: order.id,
        ...itemData,
      }))
    );

    for (const [stockKey, requiredQty] of requiredQtyByVariant.entries()) {
      const [productId, variantId] = stockKey.split('::');
      if (!productId) continue;

      await OrderInventoryService.reserveStock(productId, variantId || null, requiredQty);
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
        .populate({ path: 'items', select: 'productId variantId variantColor variantStorage productName productImage price quantity subtotal total' }),
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
      .populate({ path: 'items', select: 'productId variantId variantColor variantStorage productName productImage price quantity subtotal total' })
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
      await OrderInventoryService.restoreItemStock(item);
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
