import api from './api';

const wishlistService = {
  getWishlist: async () => {
    const response = await api.get('/wishlist');
    return response.data;
  },

  addToWishlist: async (productId) => {
    const response = await api.post('/wishlist/items', { productId });
    return response.data;
  },

  removeFromWishlist: async (productId) => {
    const response = await api.delete(`/wishlist/items/${productId}`);
    return response.data;
  },

  clearWishlist: async () => {
    const response = await api.delete('/wishlist');
    return response.data;
  },
};

export default wishlistService;
