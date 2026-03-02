import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCartKey, setActiveCartKey] = useState(null);

  const getProductId = (item) => item?.id || item?._id || item?.productId || item?.product_id;

  const getItemUnitPrice = (item) => {
    const discountPrice = Number(item.discount_price);
    const price = Number(item.price);
    return Number.isFinite(discountPrice) && discountPrice > 0 ? discountPrice : price;
  };

  const normalizeCartItem = (item, quantity = 1) => {
    const normalizedId = getProductId(item);
    return {
      ...item,
      id: normalizedId,
      quantity,
    };
  };

  const loadCartFromStorage = (storageKey) => {
    const savedCart = localStorage.getItem(storageKey);
    if (savedCart) {
      try {
        return JSON.parse(savedCart);
      } catch {
        return [];
      }
    }

    if (storageKey === 'cart_guest') {
      const legacyCart = localStorage.getItem('cart');
      if (legacyCart) {
        try {
          const parsedLegacyCart = JSON.parse(legacyCart);
          localStorage.setItem('cart_guest', JSON.stringify(parsedLegacyCart));
          localStorage.removeItem('cart');
          return parsedLegacyCart;
        } catch {
          return [];
        }
      }
    }

    return [];
  };

  // Load cart by current user
  useEffect(() => {
    const storageKey = isAuthenticated && user?.id ? `cart_${user.id}` : 'cart_guest';
    const loadedCart = loadCartFromStorage(storageKey);
    setCart(loadedCart);
    setActiveCartKey(storageKey);
    setIsLoading(false);
  }, [isAuthenticated, user?.id]);

  // Save cart for active user
  useEffect(() => {
    if (!isLoading && activeCartKey) {
      localStorage.setItem(activeCartKey, JSON.stringify(cart));
    }
  }, [cart, isLoading, activeCartKey]);

  // Add item to cart
  const addToCart = (product, quantity = 1) => {
    const normalizedProduct = normalizeCartItem(product, quantity);
    const productId = normalizedProduct.id;
    if (!productId) {
      toast.error('Không thể thêm sản phẩm vào giỏ hàng');
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => getProductId(item) === productId);

      if (existingItem) {
        // Update quantity if item exists
        const updatedCart = prevCart.map((item) =>
          getProductId(item) === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
        toast.success(`Đã cập nhật số lượng ${normalizedProduct.name}`);
        return updatedCart;
      } else {
        // Add new item
        toast.success(`Đã thêm ${normalizedProduct.name} vào giỏ hàng`);
        return [...prevCart, normalizedProduct];
      }
    });
  };

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCart((prevCart) => {
      const item = prevCart.find((cartItem) => getProductId(cartItem) === productId);
      if (item) {
        toast.success(`Đã xóa ${item.name} khỏi giỏ hàng`);
      }
      return prevCart.filter((item) => getProductId(item) !== productId);
    });
  };

  // Update item quantity
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        getProductId(item) === productId ? { ...item, quantity } : item
      )
    );
  };

  // Clear cart
  const clearCart = useCallback((options = {}) => {
    const { silent = false } = options;
    setCart((prevCart) => {
      if (prevCart.length === 0) {
        return prevCart;
      }
      return [];
    });
    if (!silent) {
      toast.success('Đã xóa toàn bộ giỏ hàng');
    }
  }, []);

  // Get cart total
  const getCartTotal = () => {
    return cart.reduce((total, item) => total + getItemUnitPrice(item) * item.quantity, 0);
  };

  // Get cart count
  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  // Check if product is in cart
  const isInCart = (productId) => {
    return cart.some((item) => getProductId(item) === productId);
  };

  // Get item quantity
  const getItemQuantity = (productId) => {
    const item = cart.find((cartItem) => getProductId(cartItem) === productId);
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
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
