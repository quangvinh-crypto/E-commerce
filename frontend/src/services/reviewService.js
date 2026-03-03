import api from './api';

const reviewService = {
  getProductReviews: async (productId, params = {}) => {
    const response = await api.get(`/products/${productId}/reviews`, { params });
    return response.data;
  },

  createProductReview: async (productId, payload) => {
    const response = await api.post(`/products/${productId}/reviews`, payload);
    return response.data;
  },

  updateReview: async (reviewId, payload) => {
    const response = await api.put(`/reviews/${reviewId}`, payload);
    return response.data;
  },

  deleteReview: async (reviewId) => {
    const response = await api.delete(`/reviews/${reviewId}`);
    return response.data;
  },

  getModerationReviews: async (params = {}) => {
    const response = await api.get('/reviews/manage', { params });
    return response.data;
  },

  setReviewVisibility: async (reviewId, isVisible) => {
    const response = await api.patch(`/reviews/${reviewId}/visibility`, { isVisible });
    return response.data;
  },
};

export default reviewService;
