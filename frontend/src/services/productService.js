import api from './api';

const buildProductFormData = (productData = {}) => {
  const formData = new FormData();
  const { primaryImage, detailImages, specifications, variants, ...rest } = productData;

  Object.entries(rest).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    formData.append(key, value);
  });

  if (specifications && Object.keys(specifications).length > 0) {
    formData.append('specifications', JSON.stringify(specifications));
  }

  if (Array.isArray(variants) && variants.length > 0) {
    formData.append('variants', JSON.stringify(variants));
  }

  if (primaryImage instanceof File) {
    formData.append('images', primaryImage);
  }

  if (Array.isArray(detailImages)) {
    detailImages.forEach((file) => {
      if (file instanceof File) {
        formData.append('images', file);
      }
    });
  }

  return formData;
};

const productService = {
  // Get all products with filters
  getProducts: async (params = {}) => {
    const sanitizedParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
    );

    const response = await api.get('/products', { params: sanitizedParams });
    return response.data;
  },

  // Get product by ID
  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // Search products
  searchProducts: async (query, params = {}) => {
    const response = await api.get('/search', { params: { q: query, ...params } });
    return response.data;
  },

  // Get search suggestions
  getSuggestions: async (query) => {
    const response = await api.get('/search/suggest', { params: { q: query } });
    return response.data;
  },

  // Create product (Staff/Admin only)
  createProduct: async (productData) => {
    const formData = buildProductFormData(productData);
    const response = await api.post('/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update product (Staff/Admin only)
  updateProduct: async (id, productData) => {
    const formData = buildProductFormData(productData);
    const response = await api.put(`/products/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete product (Staff/Admin only)
  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  // Delete single product image (Staff/Admin only)
  deleteProductImage: async (id, publicId) => {
    const response = await api.delete(`/products/${id}/images/${encodeURIComponent(publicId)}`);
    return response.data;
  },
};

export default productService;
