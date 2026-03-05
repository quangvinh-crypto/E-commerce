const { Coupon, Order } = require('../models');

class CouponService {
  createError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  normalizeCode(code) {
    return String(code || '').trim().toUpperCase();
  }

  roundAmount(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  normalizeOptionalNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  buildActor(user) {
    return {
      userId: user?.id || null,
      name: user?.name || null,
    };
  }

  async getUsageStats(code, userId) {
    const activeOrderFilter = {
      'coupon.code': code,
      status: { $ne: 'cancelled' },
    };

    const [totalUsedCount, userUsedCount] = await Promise.all([
      Order.countDocuments(activeOrderFilter),
      Order.countDocuments({
        ...activeOrderFilter,
        userId,
      }),
    ]);

    return { totalUsedCount, userUsedCount };
  }

  calculateDiscountAmount(coupon, subtotal) {
    const normalizedSubtotal = Number(subtotal) || 0;
    let discountAmount = 0;

    if (coupon.discountType === 'percentage') {
      discountAmount = (normalizedSubtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    return this.roundAmount(Math.max(0, Math.min(discountAmount, normalizedSubtotal)));
  }

  buildCouponResponse(coupon, usageStats = null) {
    const response = {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minOrderAmount: coupon.minOrderAmount,
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      usageLimit: coupon.usageLimit,
      perUserLimit: coupon.perUserLimit,
      isActive: coupon.isActive,
      createdBy: {
        userId: coupon.createdBy?.userId ? String(coupon.createdBy.userId) : null,
        name: coupon.createdBy?.name || null,
      },
      updatedBy: {
        userId: coupon.updatedBy?.userId ? String(coupon.updatedBy.userId) : null,
        name: coupon.updatedBy?.name || null,
      },
    };

    if (usageStats) {
      response.usage = usageStats;
    }

    return response;
  }

  async createCoupon(couponData, createdByUser = null) {
    const code = this.normalizeCode(couponData.code);
    if (!code) {
      throw this.createError('Coupon code is required');
    }

    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      throw this.createError('Coupon code already exists');
    }

    const discountType = couponData.discountType;
    const discountValue = Number(couponData.discountValue);
    if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
      throw this.createError('Percentage discount must be between 0 and 100');
    }

    const startsAt = couponData.startsAt ? new Date(couponData.startsAt) : new Date();
    const expiresAt = new Date(couponData.expiresAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
      throw this.createError('startsAt and expiresAt must be valid dates');
    }

    if (expiresAt <= startsAt) {
      throw this.createError('expiresAt must be greater than startsAt');
    }

    const coupon = await Coupon.create({
      ...couponData,
      code,
      description: null,
      maxDiscountAmount: this.normalizeOptionalNumber(couponData.maxDiscountAmount),
      minOrderAmount: this.normalizeOptionalNumber(couponData.minOrderAmount) ?? 0,
      usageLimit: this.normalizeOptionalNumber(couponData.usageLimit),
      perUserLimit: this.normalizeOptionalNumber(couponData.perUserLimit) ?? 1,
      startsAt,
      expiresAt,
      createdBy: this.buildActor(createdByUser),
      updatedBy: this.buildActor(createdByUser),
    });

    return this.buildCouponResponse(coupon);
  }

  async getCoupons(filters = {}, options = {}) {
    const { isActive, code } = filters;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = options;

    const whereClause = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    if (code) {
      whereClause.code = { $regex: this.normalizeCode(code), $options: 'i' };
    }

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const sortDirection = String(sortOrder).toUpperCase() === 'ASC' ? 1 : -1;

    const [rows, count] = await Promise.all([
      Coupon.find(whereClause)
        .sort({ [sortBy]: sortDirection })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit),
      Coupon.countDocuments(whereClause),
    ]);

    return {
      coupons: rows.map((coupon) => this.buildCouponResponse(coupon)),
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(count / parsedLimit),
      },
    };
  }

  async updateCoupon(couponId, couponData, actorUser = null) {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      throw this.createError('Coupon does not exist', 404);
    }

    if (couponData.code !== undefined) {
      const nextCode = this.normalizeCode(couponData.code);
      if (!nextCode) {
        throw this.createError('Coupon code is required');
      }

      const existingCoupon = await Coupon.findOne({ code: nextCode, _id: { $ne: couponId } });
      if (existingCoupon) {
        throw this.createError('Coupon code already exists');
      }

      coupon.code = nextCode;
    }

    const nextDiscountType = couponData.discountType !== undefined ? couponData.discountType : coupon.discountType;
    const nextDiscountValue = couponData.discountValue !== undefined ? Number(couponData.discountValue) : Number(coupon.discountValue);
    if (nextDiscountType === 'percentage' && (nextDiscountValue <= 0 || nextDiscountValue > 100)) {
      throw this.createError('Percentage discount must be between 0 and 100');
    }

    if (couponData.discountType !== undefined) coupon.discountType = couponData.discountType;
    if (couponData.discountValue !== undefined) coupon.discountValue = nextDiscountValue;

    if (couponData.maxDiscountAmount !== undefined) {
      coupon.maxDiscountAmount = this.normalizeOptionalNumber(couponData.maxDiscountAmount);
    }

    if (couponData.minOrderAmount !== undefined) {
      const minOrderAmount = this.normalizeOptionalNumber(couponData.minOrderAmount);
      coupon.minOrderAmount = minOrderAmount === null ? 0 : minOrderAmount;
    }

    if (couponData.usageLimit !== undefined) {
      coupon.usageLimit = this.normalizeOptionalNumber(couponData.usageLimit);
    }

    if (couponData.perUserLimit !== undefined) {
      const perUserLimit = this.normalizeOptionalNumber(couponData.perUserLimit);
      coupon.perUserLimit = perUserLimit === null ? 1 : perUserLimit;
    }

    if (couponData.startsAt !== undefined) {
      const startsAt = new Date(couponData.startsAt);
      if (Number.isNaN(startsAt.getTime())) {
        throw this.createError('startsAt must be a valid date');
      }
      coupon.startsAt = startsAt;
    }

    if (couponData.expiresAt !== undefined) {
      const expiresAt = new Date(couponData.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) {
        throw this.createError('expiresAt must be a valid date');
      }
      coupon.expiresAt = expiresAt;
    }

    if (coupon.expiresAt <= coupon.startsAt) {
      throw this.createError('expiresAt must be greater than startsAt');
    }

    if (couponData.isActive !== undefined) {
      coupon.isActive = Boolean(couponData.isActive);
    }

    coupon.updatedBy = this.buildActor(actorUser);

    await coupon.save();
    return this.buildCouponResponse(coupon);
  }

  async deleteCoupon(couponId) {
    const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
    if (!deletedCoupon) {
      throw this.createError('Coupon does not exist', 404);
    }
  }

  async validateCouponForUser(userId, code, subtotal) {
    const normalizedCode = this.normalizeCode(code);
    if (!normalizedCode) {
      throw this.createError('Coupon code is required');
    }

    const normalizedSubtotal = Number(subtotal) || 0;
    const coupon = await Coupon.findOne({ code: normalizedCode });
    if (!coupon) {
      throw this.createError('Coupon does not exist', 404);
    }

    if (!coupon.isActive) {
      throw this.createError('Coupon is inactive');
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw this.createError('Coupon is not active yet');
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw this.createError('Coupon has expired');
    }

    if (normalizedSubtotal < coupon.minOrderAmount) {
      throw this.createError(`Order must be at least ${coupon.minOrderAmount.toLocaleString('vi-VN')} VND to use this coupon`);
    }

    const usageStats = await this.getUsageStats(normalizedCode, userId);

    if (coupon.usageLimit && usageStats.totalUsedCount >= coupon.usageLimit) {
      throw this.createError('Coupon usage limit has been reached');
    }

    if (coupon.perUserLimit && usageStats.userUsedCount >= coupon.perUserLimit) {
      throw this.createError('You have reached this coupon usage limit');
    }

    const discountAmount = this.calculateDiscountAmount(coupon, normalizedSubtotal);

    return {
      coupon,
      discountAmount,
      totalAfterDiscount: this.roundAmount(Math.max(0, normalizedSubtotal - discountAmount)),
      usageStats,
    };
  }
}

module.exports = new CouponService();
