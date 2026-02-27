import { createContext, useContext, useState, useEffect } from 'react';
import wishlistService from '../services/wishlistService';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = () => {
    const items = wishlistService.getWishlist();
    setWishlist(items);
    setWishlistCount(items.length);
  };

  const addToWishlist = (product) => {
    const result = wishlistService.addToWishlist(product);
    if (result.success) {
      loadWishlist();
    }
    return result;
  };

  const removeFromWishlist = (productId) => {
    const result = wishlistService.removeFromWishlist(productId);
    if (result.success) {
      loadWishlist();
    }
    return result;
  };

  const isInWishlist = (productId) => {
    return wishlistService.isInWishlist(productId);
  };

  const clearWishlist = () => {
    const result = wishlistService.clearWishlist();
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
