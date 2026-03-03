const ReviewService = require('../services/ReviewService');

class ReviewController {
  async getProductReviews(req, res, next) {
    try {
      const { id: productId } = req.params;
      const { page, limit } = req.query;

      const result = await ReviewService.getProductReviews(productId, {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        includeHidden: false,
      });

      res.status(200).json({
        success: true,
        message: 'Reviews retrieved successfully',
        data: result.reviews,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async createProductReview(req, res, next) {
    try {
      const { id: productId } = req.params;
      const result = await ReviewService.createReview(productId, req.user, req.body);

      res.status(result.created ? 201 : 200).json({
        success: true,
        message: result.created ? 'Review created successfully' : 'Review updated successfully',
        data: result.review,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateReview(req, res, next) {
    try {
      const { id } = req.params;
      const review = await ReviewService.updateReview(id, req.user, req.body);

      res.status(200).json({
        success: true,
        message: 'Review updated successfully',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteReview(req, res, next) {
    try {
      const { id } = req.params;
      const result = await ReviewService.deleteReview(id, req.user);

      res.status(200).json({
        success: true,
        message: 'Review deleted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async setReviewVisibility(req, res, next) {
    try {
      const { id } = req.params;
      const { isVisible } = req.body;

      const review = await ReviewService.setVisibility(id, req.user.id, isVisible);

      res.status(200).json({
        success: true,
        message: 'Review visibility updated successfully',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  async getReviewsForModeration(req, res, next) {
    try {
      const { productId, search, isVisible, page, limit } = req.query;

      const result = await ReviewService.getReviewsForModeration(
        {
          productId,
          search,
          isVisible: isVisible !== undefined ? isVisible === 'true' : undefined,
        },
        {
          page: page ? parseInt(page, 10) : 1,
          limit: limit ? parseInt(limit, 10) : 20,
        }
      );

      res.status(200).json({
        success: true,
        message: 'Moderation reviews retrieved successfully',
        data: result.reviews,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReviewController();
