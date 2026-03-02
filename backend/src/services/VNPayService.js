const crypto = require('crypto');

class VNPayService {
  constructor() {
    this.tmnCode = process.env.VNPAY_TMN_CODE;
    this.hashSecret = process.env.VNPAY_HASH_SECRET;
    this.baseUrl = process.env.VNPAY_BASE_URL;
    this.returnUrl = process.env.VNPAY_RETURN_URL;
    this.version = process.env.VNPAY_VERSION || '2.1.0';
    this.command = process.env.VNPAY_COMMAND || 'pay';
    this.currCode = process.env.VNPAY_CURRENCY || 'VND';
    this.locale = process.env.VNPAY_LOCALE || 'vn';
  }

  hasRequiredConfig() {
    return Boolean(this.tmnCode && this.hashSecret && this.baseUrl && this.returnUrl);
  }

  sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = obj[key];
    }
    return sorted;
  }

  createPaymentUrl(orderId, amount, orderInfo, ipAddr, bankCode = null) {
    const date = new Date();
    const createDate = this.formatDate(date);
    const expireDate = this.formatDate(new Date(date.getTime() + 15 * 60 * 1000));

    let vnpParams = {
      vnp_Version: this.version,
      vnp_Command: this.command,
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: this.locale,
      vnp_CurrCode: this.currCode,
      vnp_TxnRef: orderId.toString(),
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(amount * 100),
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    if (bankCode) {
      vnpParams.vnp_BankCode = bankCode;
    }

    vnpParams = this.sortObject(vnpParams);

    const signData = new URLSearchParams(vnpParams).toString();
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    vnpParams.vnp_SecureHash = signed;

    const paymentUrl = `${this.baseUrl}?${new URLSearchParams(vnpParams).toString()}`;
    return paymentUrl;
  }

  verifyReturnUrl(vnpParams) {
    const secureHash = vnpParams.vnp_SecureHash;
    
    const params = { ...vnpParams };
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const sortedParams = this.sortObject(params);
    const signData = new URLSearchParams(sortedParams).toString();
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
  }

  verifyIpn(vnpParams) {
    return this.verifyReturnUrl(vnpParams);
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  getResponseCode(code) {
    const responseCodes = {
      '00': 'Giao dịch thành công',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)',
      '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng',
      '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch',
      '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa',
      '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP)',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày',
      '75': 'Ngân hàng thanh toán đang bảo trì',
      '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định',
      '99': 'Các lỗi khác',
    };
    return responseCodes[code] || 'Lỗi không xác định';
  }
}

module.exports = new VNPayService();
