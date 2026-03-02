const VNPayService = require('../services/VNPayService');
const { Order } = require('../models');

class PaymentController {
  /**
   * Create VNPay payment URL
   * @route POST /api/payment/vnpay/create
   */
  async createVNPayPayment(req, res, next) {
    try {
      const { orderId, bankCode } = req.body;
      const userId = req.user.id;

      if (!VNPayService.hasRequiredConfig()) {
        return res.status(500).json({
          success: false,
          message: 'VNPay is not configured. Please set VNPAY_* environment variables.',
        });
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required',
        });
      }

      const order = await Order.findOne({ _id: orderId, userId });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      if (order.paymentStatus === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Order has already been paid',
        });
      }

      if (order.paymentMethod !== 'vnpay') {
        return res.status(400).json({
          success: false,
          message: 'Order payment method is not VNPay',
        });
      }

      if (['cancelled', 'refunded'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create payment for this order status',
        });
      }

      const forwardedFor = req.headers['x-forwarded-for'];
      const ipAddr = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : forwardedFor) ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        '127.0.0.1';

      const orderInfo = `Thanh toan don hang ${order.orderNumber}`;
      const amount = parseFloat(order.total);

      const paymentUrl = VNPayService.createPaymentUrl(
        order.id,
        amount,
        orderInfo,
        ipAddr,
        bankCode
      );

      res.status(200).json({
        success: true,
        message: 'Payment URL created successfully',
        data: {
          paymentUrl,
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: amount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * VNPay return URL handler
   * @route GET /api/payment/vnpay/return
   */
  async vnpayReturn(req, res, next) {
    try {
      const vnpParams = req.query;
      const isValid = VNPayService.verifyReturnUrl(vnpParams);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      if (!isValid) {
        return res.redirect(
          `${frontendUrl}/checkout/result?status=failed&message=Invalid signature`
        );
      }

      const orderId = vnpParams.vnp_TxnRef;
      const responseCode = vnpParams.vnp_ResponseCode;
      const transactionNo = vnpParams.vnp_TransactionNo;
      const bankCode = vnpParams.vnp_BankCode;
      const amount = parseInt(vnpParams.vnp_Amount) / 100;

      const order = await Order.findById(orderId);

      if (!order) {
        return res.redirect(
          `${frontendUrl}/checkout/result?status=failed&message=Order not found`
        );
      }

      const orderAmount = Number(order.total);
      if (Math.round(orderAmount * 100) !== Math.round(amount * 100)) {
        return res.redirect(
          `${frontendUrl}/checkout/result?status=failed&orderId=${order.id}&message=${encodeURIComponent('Invalid amount')}`
        );
      }

      if (order.paymentStatus === 'paid') {
        return res.redirect(
          `${frontendUrl}/checkout/result?status=success&orderId=${order.id}&orderNumber=${order.orderNumber}`
        );
      }

      if (responseCode === '00') {
        order.paymentStatus = 'paid';
        order.paidAt = new Date();
        order.status = 'confirmed';
        order.transactionId = transactionNo;
        order.paymentDetails = {
          bankCode,
          transactionNo,
          amount,
          responseCode,
          paymentMethod: 'vnpay',
        };
        await order.save();

        return res.redirect(
          `${frontendUrl}/checkout/result?status=success&orderId=${order.id}&orderNumber=${order.orderNumber}`
        );
      } else {
        const message = VNPayService.getResponseCode(responseCode);
        order.paymentStatus = 'failed';
        order.paymentDetails = {
          bankCode,
          transactionNo,
          amount,
          responseCode,
          message,
          paymentMethod: 'vnpay',
        };
        await order.save();

        return res.redirect(
          `${frontendUrl}/checkout/result?status=failed&orderId=${order.id}&message=${encodeURIComponent(message)}`
        );
      }
    } catch (error) {
      console.error('VNPay return error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(
        `${frontendUrl}/checkout/result?status=failed&message=Server error`
      );
    }
  }

  /**
   * VNPay IPN handler (Instant Payment Notification)
   * @route GET /api/payment/vnpay/ipn
   */
  async vnpayIpn(req, res, next) {
    try {
      const vnpParams = req.query;
      const isValid = VNPayService.verifyIpn(vnpParams);

      if (!isValid) {
        return res.status(200).json({ RspCode: '97', Message: 'Invalid Checksum' });
      }

      const orderId = vnpParams.vnp_TxnRef;
      const responseCode = vnpParams.vnp_ResponseCode;
      const transactionNo = vnpParams.vnp_TransactionNo;
      const amount = parseInt(vnpParams.vnp_Amount) / 100;

      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      }

      if (Math.round(Number(order.total) * 100) !== Math.round(amount * 100)) {
        return res.status(200).json({ RspCode: '04', Message: 'Invalid Amount' });
      }

      if (order.paymentStatus === 'paid') {
        return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
      }

      if (responseCode === '00') {
        order.paymentStatus = 'paid';
        order.paidAt = new Date();
        order.status = 'confirmed';
        order.transactionId = transactionNo;
        order.paymentDetails = {
          transactionNo,
          amount,
          responseCode,
          paymentMethod: 'vnpay',
          source: 'ipn',
        };
        await order.save();

        return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
      } else {
        order.paymentStatus = 'failed';
        order.paymentDetails = {
          transactionNo,
          amount,
          responseCode,
          message: VNPayService.getResponseCode(responseCode),
          paymentMethod: 'vnpay',
          source: 'ipn',
        };
        await order.save();

        return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
      }
    } catch (error) {
      console.error('VNPay IPN error:', error);
      return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
    }
  }

  /**
   * Get payment status
   * @route GET /api/payment/status/:orderId
   */
  async getPaymentStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await Order.findOne({ _id: orderId, userId }).select('orderNumber paymentStatus paymentMethod total paidAt');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          total: order.total,
          paidAt: order.paidAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
