import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import wishlistService from '../services/wishlistService';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  const [wishlist, setWishlist] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);

  const loadWishlist = useCallback(() => {
    const items = wishlistService.getWishlist(userId);
    setWishlist(items);
    setWishlistCount(items.length);
  }, [userId]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const addToWishlist = (product) => {
    const result = wishlistService.addToWishlist(product, userId);
    if (result.success) {
      loadWishlist();
    }
    return result;
  };

  const removeFromWishlist = (productId) => {
    const result = wishlistService.removeFromWishlist(productId, userId);
    if (result.success) {
      loadWishlist();
    }
    return result;
  };

  const isInWishlist = (productId) => {
    return wishlistService.isInWishlist(productId, userId);
  };

  const clearWishlist = () => {
    const result = wishlistService.clearWishlist(userId);
    if (result.success) {
      loadWishlist();
    }
    return result;
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        clearWishlist,
        loadWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export default WishlistContext;
