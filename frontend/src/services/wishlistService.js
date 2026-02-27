const WISHLIST_KEY = 'wishlist';

const wishlistService = {
  getWishlist: () => {
    const wishlist = localStorage.getItem(WISHLIST_KEY);
    return wishlist ? JSON.parse(wishlist) : [];
  },

  addToWishlist: (product) => {
    const wishlist = wishlistService.getWishlist();
    const exists = wishlist.find(item => item.id === product.id);
    if (!exists) {
      wishlist.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        addedAt: new Date().toISOString(),
      });
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
      return { success: true, message: 'Đã thêm vào yêu thích' };
    }
    return { success: false, message: 'Sản phẩm đã có trong danh sách yêu thích' };
  },

  removeFromWishlist: (productId) => {
    const wishlist = wishlistService.getWishlist();
    const filtered = wishlist.filter(item => item.id !== productId);
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(filtered));
    return { success: true, message: 'Đã xóa khỏi yêu thích' };
  },

  isInWishlist: (productId) => {
    const wishlist = wishlistService.getWishlist();
    return wishlist.some(item => item.id === productId);
  },

  clearWishlist: () => {
    localStorage.removeItem(WISHLIST_KEY);
    return { success: true, message: 'Đã xóa tất cả' };
  },

  getWishlistCount: () => {
    return wishlistService.getWishlist().length;
  },
};

export default wishlistService;
