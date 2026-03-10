import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import cartService from '../services/cartService';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getProductId = (item) => item?.id || item?._id || item?.productId || item?.product_id;
  const getVariantId = (item) => item?.variantId || item?.variant_id || item?.variant?.id || null;
  const getCartItemKey = (item) => `${getProductId(item) || ''}::${getVariantId(item) || ''}`;

  const getItemUnitPrice = (item) => {
    const discountPrice = Number(item.discount_price);
    const price = Number(item.price);
    return Number.isFinite(discountPrice) && discountPrice > 0 ? discountPrice : price;
  };

  const loadCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await cartService.getCart();
      setCart(Array.isArray(response?.data) ? response.data : []);
    } catch (_) {
      setCart([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const addToCart = useCallback(async (product, quantity = 1, options = {}) => {
    const productId = getProductId(product);
    const variantId = options.variantId || getVariantId(product);
    if (!productId) {
      toast.error('Không thể thêm sản phẩm vào giỏ hàng');
      return { success: false };
    }

    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
      return { success: false };
    }

    try {
      const response = await cartService.addToCart(productId, quantity, variantId);
      setCart(Array.isArray(response?.data) ? response.data : []);
      toast.success(`Đã thêm ${product?.name || 'sản phẩm'} vào giỏ hàng`);
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể thêm sản phẩm vào giỏ hàng');
      return { success: false };
    }
  }, [isAuthenticated]);

  const removeFromCart = useCallback(async (productId, variantId = null) => {
    if (!isAuthenticated) {
      return { success: false };
    }

    const item = cart.find(
      (cartItem) => getProductId(cartItem) === productId && (variantId || null) === (getVariantId(cartItem) || null)
    );

    try {
      const response = await cartService.removeCartItem(productId, variantId);
      setCart(Array.isArray(response?.data) ? response.data : []);
      if (item) {
        toast.success(`Đã xóa ${item.name} khỏi giỏ hàng`);
      }
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xóa sản phẩm khỏi giỏ hàng');
      return { success: false };
    }
  }, [cart, isAuthenticated]);

  const updateQuantity = useCallback(async (productId, quantity, variantId = null) => {
    if (!isAuthenticated) {
      return { success: false };
    }

    try {
      const response = await cartService.updateCartItem(productId, quantity, variantId);
      setCart(Array.isArray(response?.data) ? response.data : []);
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật số lượng sản phẩm');
      return { success: false };
    }
  }, [isAuthenticated]);

  const clearCart = useCallback(async (options = {}) => {
    const { silent = false } = options;

    if (!isAuthenticated) {
      setCart([]);
      return { success: true };
    }

    try {
      await cartService.clearCart();
      setCart([]);
      if (!silent) {
        toast.success('Đã xóa toàn bộ giỏ hàng');
      }
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xóa giỏ hàng');
      return { success: false };
    }
  }, [isAuthenticated]);

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + getItemUnitPrice(item) * item.quantity, 0);
  };

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const isInCart = (productId, variantId = null) => {
    return cart.some(
      (item) => getProductId(item) === productId && (variantId || null) === (getVariantId(item) || null)
    );
  };

  const getItemQuantity = (productId, variantId = null) => {
    const item = cart.find(
      (cartItem) => getProductId(cartItem) === productId && (variantId || null) === (getVariantId(cartItem) || null)
    );
    return item ? item.quantity : 0;
  };

  const value = {
    cart,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    isInCart,
    getItemQuantity,
    getVariantId,
    getCartItemKey,
    loadCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
