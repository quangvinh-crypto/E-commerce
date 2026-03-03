import api from './api';

const orderService = {
  // Create new order
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  // Get my orders
  getMyOrders: async (params = {}) => {
    const response = await api.get('/orders/my', { params });
    return response.data;
  },

  // Get order by ID
  getOrderById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (id, reason = null) => {
    const response = await api.put(`/orders/${id}/cancel`, { reason });
    return response.data;
  },

  // Get all orders (Staff/Admin only)
  getAllOrders: async (params = {}) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  // Update order status (Staff/Admin only)
  updateOrderStatus: async (id, status, trackingNumber = null, shippingCarrier = null) => {
    const payload = { status };

    if (typeof trackingNumber === 'string' && trackingNumber.trim()) {
      payload.trackingNumber = trackingNumber.trim();
    }

    if (typeof shippingCarrier === 'string' && shippingCarrier.trim()) {
      payload.shippingCarrier = shippingCarrier.trim();
    }

    const response = await api.put(`/orders/${id}/status`, payload);
    return response.data;
  },
};

export default orderService;
