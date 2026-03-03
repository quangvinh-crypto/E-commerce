const mongoose = require('mongoose');
const { Product, Review } = require('../models');

class ReviewService {
  createError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  canManageReview(user, review) {
    if (!user || !review) return false;
    if (user.role === 'admin' || user.role === 'staff') return true;
    return String(user.id) === String(review.userId);
  }

  async ensureProductExists(productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw this.createError('Invalid product ID format', 400);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw this.createError('Product not found', 404);
    }

    return product;
  }

  async recalculateProductRating(productId) {
    const [result] = await Review.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          parentId: null,
          isVisible: true,
          rating: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
        },
      },
    ]);

    const ratingAverage = result?.averageRating
      ? Math.round(result.averageRating * 10) / 10
      : 0;
    const ratingCount = result?.ratingCount || 0;

    await Product.findByIdAndUpdate(productId, {
      ratingAverage,
      ratingCount,
    });

    return { ratingAverage, ratingCount };
  }

  async getProductReviews(productId, options = {}) {
    await this.ensureProductExists(productId);

    const { page = 1, limit = 10, includeHidden = false } = options;
    const parsedPage = Number(page) > 0 ? Number(page) : 1;
    const parsedLimit = Number(limit) > 0 ? Number(limit) : 10;
    const visibilityFilter = includeHidden ? {} : { isVisible: true };

    const rootFilter = {
      productId,
      parentId: null,
      ...visibilityFilter,
    };

    const [total, roots] = await Promise.all([
      Review.countDocuments(rootFilter),
      Review.find(rootFilter)
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .populate({ path: 'user', select: 'name avatar role' }),
    ]);

    const rootIds = roots.map((review) => review._id);
    let replies = [];

    if (rootIds.length > 0) {
      replies = await Review.find({
        productId,
        parentId: { $in: rootIds },
        ...visibilityFilter,
      })
        .sort({ createdAt: 1 })
        .populate({ path: 'user', select: 'name avatar role' });
    }

    const repliesByParentId = new Map();
    replies.forEach((reply) => {
      const key = String(reply.parentId);
      const list = repliesByParentId.get(key) || [];
      list.push(reply);
      repliesByParentId.set(key, list);
    });

    const rootReviews = roots.map((review) => {
      const asJson = review.toJSON();
      asJson.replies = (repliesByParentId.get(review.id) || []).map((reply) => reply.toJSON());
      return asJson;
    });

    return {
      reviews: rootReviews,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  async createReview(productId, user, payload = {}) {
    await this.ensureProductExists(productId);

    const { rating, comment, parentId } = payload;
    const normalizedComment = String(comment || '').trim();

    if (!normalizedComment) {
      throw this.createError('Comment is required', 400);
    }

    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        throw this.createError('Invalid parent review ID format', 400);
      }

      const parentReview = await Review.findOne({
        _id: parentId,
        productId,
        parentId: null,
      });

      if (!parentReview) {
        throw this.createError('Parent review not found', 404);
      }

      const reply = await Review.create({
        productId,
        userId: user.id,
        parentId,
        rating: null,
        comment: normalizedComment,
      });

      return { review: await reply.populate({ path: 'user', select: 'name avatar role' }), created: true };
    }

    const parsedRating = Number(rating);
    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw this.createError('Rating must be a number from 1 to 5', 400);
    }

    let review = await Review.findOne({
      productId,
      userId: user.id,
      parentId: null,
    });

    let created = false;
    if (review) {
      review.rating = parsedRating;
      review.comment = normalizedComment;
      review.isVisible = true;
      review.moderatedBy = null;
      review.moderatedAt = null;
      await review.save();
    } else {
      review = await Review.create({
        productId,
        userId: user.id,
        rating: parsedRating,
        comment: normalizedComment,
      });
      created = true;
    }

    await this.recalculateProductRating(productId);
    await review.populate({ path: 'user', select: 'name avatar role' });

    return { review, created };
  }

  async updateReview(reviewId, user, payload = {}) {
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw this.createError('Invalid review ID format', 400);
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      throw this.createError('Review not found', 404);
    }

    if (!this.canManageReview(user, review)) {
      throw this.createError('Not authorized to update this review', 403);
    }

    const { comment, rating } = payload;

    if (comment !== undefined) {
      const normalizedComment = String(comment || '').trim();
      if (!normalizedComment) {
        throw this.createError('Comment is required', 400);
      }
      review.comment = normalizedComment;
    }

    if (review.parentId && rating !== undefined) {
      throw this.createError('Reply cannot have rating', 400);
    }

    if (!review.parentId && rating !== undefined) {
      const parsedRating = Number(rating);
      if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        throw this.createError('Rating must be a number from 1 to 5', 400);
      }
      review.rating = parsedRating;
    }

    await review.save();

    if (!review.parentId) {
      await this.recalculateProductRating(review.productId);
    }

    await review.populate({ path: 'user', select: 'name avatar role' });
    return review;
  }

  async deleteReview(reviewId, user) {
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw this.createError('Invalid review ID format', 400);
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      throw this.createError('Review not found', 404);
    }

    if (!this.canManageReview(user, review)) {
      throw this.createError('Not authorized to delete this review', 403);
    }

    if (!review.parentId) {
      await Review.deleteMany({ parentId: review._id });
    }

    await review.deleteOne();

    if (!review.parentId) {
      await this.recalculateProductRating(review.productId);
    }

    return { id: review.id };
  }

  async setVisibility(reviewId, staffUserId, isVisible) {
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw this.createError('Invalid review ID format', 400);
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      throw this.createError('Review not found', 404);
    }

    review.isVisible = Boolean(isVisible);
    review.moderatedBy = staffUserId;
    review.moderatedAt = new Date();
    await review.save();

    if (!review.parentId) {
      await Review.updateMany(
        { parentId: review._id },
        {
          isVisible: Boolean(isVisible),
          moderatedBy: staffUserId,
          moderatedAt: new Date(),
        }
      );
      await this.recalculateProductRating(review.productId);
    }

    await review.populate({ path: 'user', select: 'name avatar role' });
    return review;
  }

  async getReviewsForModeration(filters = {}, options = {}) {
    const { productId, isVisible, search } = filters;
    const { page = 1, limit = 20 } = options;

    const whereClause = {};
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      whereClause.productId = productId;
    }
    if (isVisible !== undefined) {
      whereClause.isVisible = isVisible;
    }
    if (search) {
      whereClause.comment = { $regex: search, $options: 'i' };
    }

    const parsedPage = Number(page) > 0 ? Number(page) : 1;
    const parsedLimit = Number(limit) > 0 ? Number(limit) : 20;

    const [total, rows] = await Promise.all([
      Review.countDocuments(whereClause),
      Review.find(whereClause)
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .populate({ path: 'user', select: 'name email role' })
        .populate({ path: 'productId', select: 'name ratingAverage ratingCount' })
        .populate({ path: 'parentId', select: 'comment userId' }),
    ]);

    return {
      reviews: rows,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }
}

module.exports = new ReviewService();
