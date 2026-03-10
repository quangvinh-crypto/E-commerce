import api from './api';

const cartService = {
  getCart: async () => {
    const response = await api.get('/cart');
    return response.data;
  },

  addToCart: async (productId, quantity = 1, variantId = null) => {
    const payload = { productId, quantity };
    if (variantId) payload.variantId = variantId;
    const response = await api.post('/cart/items', payload);
    return response.data;
  },

  updateCartItem: async (productId, quantity, variantId = null) => {
    const payload = { quantity };
    if (variantId) payload.variantId = variantId;
    const response = await api.patch(`/cart/items/${productId}`, payload);
    return response.data;
  },

  removeCartItem: async (productId, variantId = null) => {
    const response = await api.delete(`/cart/items/${productId}`, {
      params: variantId ? { variantId } : undefined,
    });
    return response.data;
  },

  clearCart: async () => {
    const response = await api.delete('/cart');
    return response.data;
  },
};

export default cartService;
