import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import wishlistService from '../services/wishlistService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);

  const wishlistIdSet = useMemo(
    () => new Set(wishlist.map((item) => String(item.id))),
    [wishlist]
  );

  const loadWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      setWishlistCount(0);
      return;
    }

    try {
      const response = await wishlistService.getWishlist();
      const items = Array.isArray(response?.data) ? response.data : [];
      setWishlist(items);
      setWishlistCount(items.length);
    } catch (_) {
      setWishlist([]);
      setWishlistCount(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const addToWishlist = useCallback(async (product) => {
    if (!isAuthenticated) {
      return { success: false, message: 'Vui lòng đăng nhập để thêm vào yêu thích' };
    }

    try {
      const response = await wishlistService.addToWishlist(product.id);
      const items = Array.isArray(response?.data) ? response.data : [];
      setWishlist(items);
      setWishlistCount(items.length);
      return { success: true, message: 'Đã thêm vào yêu thích' };
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể thêm vào yêu thích';
      toast.error(message);
      return { success: false, message };
    }
  }, [isAuthenticated]);

  const removeFromWishlist = useCallback(async (productId) => {
    if (!isAuthenticated) {
      return { success: false, message: 'Vui lòng đăng nhập để thao tác' };
    }

    try {
      const response = await wishlistService.removeFromWishlist(productId);
      const items = Array.isArray(response?.data) ? response.data : [];
      setWishlist(items);
      setWishlistCount(items.length);
      return { success: true, message: 'Đã xóa khỏi yêu thích' };
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể xóa khỏi yêu thích';
      toast.error(message);
      return { success: false, message };
    }
  }, [isAuthenticated]);

  const isInWishlist = (productId) => {
    return wishlistIdSet.has(String(productId));
  };

  const clearWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      setWishlistCount(0);
      return { success: true, message: 'Đã xóa tất cả' };
    }

    try {
      await wishlistService.clearWishlist();
      setWishlist([]);
      setWishlistCount(0);
      return { success: true, message: 'Đã xóa tất cả' };
    } catch (error) {
      const message = error.response?.data?.message || 'Không thể xóa danh sách yêu thích';
      toast.error(message);
      return { success: false, message };
    }
  }, [isAuthenticated]);

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
