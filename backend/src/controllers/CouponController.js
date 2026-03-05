const CouponService = require('../services/CouponService');

class CouponController {
  async createCoupon(req, res, next) {
    try {
      const coupon = await CouponService.createCoupon(req.body, req.user);

      res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        data: coupon,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCoupon(req, res, next) {
    try {
      const coupon = await CouponService.updateCoupon(req.params.id, req.body, req.user);

      res.status(200).json({
        success: true,
        message: 'Coupon updated successfully',
        data: coupon,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCoupon(req, res, next) {
    try {
      await CouponService.deleteCoupon(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Coupon deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getCoupons(req, res, next) {
    try {
      const { isActive, code, page, limit, sortBy, sortOrder } = req.query;

      const filters = {
        code,
        isActive: isActive === undefined ? undefined : isActive === 'true',
      };

      const options = {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'DESC',
      };

      const result = await CouponService.getCoupons(filters, options);

      res.status(200).json({
        success: true,
        message: 'Coupons retrieved successfully',
        data: result.coupons,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async validateCoupon(req, res, next) {
    try {
      const userId = req.user.id;
      const { code, subtotal } = req.body;

      const result = await CouponService.validateCouponForUser(userId, code, subtotal);

      res.status(200).json({
        success: true,
        message: 'Coupon is valid',
        data: {
          coupon: CouponService.buildCouponResponse(result.coupon, result.usageStats),
          discountAmount: result.discountAmount,
          subtotal: Number(subtotal) || 0,
          totalAfterDiscount: result.totalAfterDiscount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CouponController();
