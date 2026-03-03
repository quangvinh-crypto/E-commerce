const WISHLIST_KEY = 'wishlist';

const getProductImage = (product = {}) => {
  if (product.image_url) return product.image_url;

  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0];
    if (typeof firstImage === 'string') return firstImage;
    if (firstImage?.url) return firstImage.url;
  }

  return '';
};

const wishlistService = {
  getWishlist: () => {
    const wishlist = localStorage.getItem(WISHLIST_KEY);
    const parsed = wishlist ? JSON.parse(wishlist) : [];
    const normalized = Array.isArray(parsed)
      ? parsed.map((item) => ({
          ...item,
          image_url: item.image_url || getProductImage(item),
          images: Array.isArray(item.images) ? item.images : [],
        }))
      : [];

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(normalized));
    }

    return normalized;
  },

  addToWishlist: (product) => {
    const wishlist = wishlistService.getWishlist();
    const exists = wishlist.find(item => item.id === product.id);
    if (!exists) {
      wishlist.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: getProductImage(product),
        images: Array.isArray(product.images) ? product.images : [],
        specifications: product.specifications || null,
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

  upsertWishlistItem: (product) => {
    const wishlist = wishlistService.getWishlist();
    const mappedItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: getProductImage(product),
      images: Array.isArray(product.images) ? product.images : [],
      specifications: product.specifications || null,
      addedAt: new Date().toISOString(),
    };

    const index = wishlist.findIndex((item) => item.id === product.id);
    if (index >= 0) {
      wishlist[index] = { ...wishlist[index], ...mappedItem, addedAt: wishlist[index].addedAt || mappedItem.addedAt };
    } else {
      wishlist.push(mappedItem);
    }

    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    return { success: true };
  },

  getWishlistCount: () => {
    return wishlistService.getWishlist().length;
  },
};

export default wishlistService;
