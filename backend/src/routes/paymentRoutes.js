const express = require('express');
const PaymentController = require('../controllers/PaymentController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create VNPay payment URL (requires authentication)
router.post('/vnpay/create', auth, PaymentController.createVNPayPayment);

// VNPay return URL (no auth - called by VNPay redirect)
router.get('/vnpay/return', PaymentController.vnpayReturn);

// VNPay IPN URL (no auth - called by VNPay server)
router.get('/vnpay/ipn', PaymentController.vnpayIpn);

// Get payment status (requires authentication)
router.get('/status/:orderId', auth, PaymentController.getPaymentStatus);

module.exports = router;
