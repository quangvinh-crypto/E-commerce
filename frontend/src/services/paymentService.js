import api from './api';

const paymentService = {
  // Create VNPay payment URL
  createVNPayPayment: async (orderId, bankCode = null) => {
    const response = await api.post('/payment/vnpay/create', { orderId, bankCode });
    return response.data;
  },

  // Get payment status
  getPaymentStatus: async (orderId) => {
    const response = await api.get(`/payment/status/${orderId}`);
    return response.data;
  },
};

export default paymentService;
