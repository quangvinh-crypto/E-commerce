const LEGACY_WISHLIST_KEY = 'wishlist';

const normalizeUserId = (userId) => {
  if (userId === null || userId === undefined || userId === '') return 'guest';
  return String(userId);
};

const getWishlistKey = (userId) => `wishlist:${normalizeUserId(userId)}`;

const readWishlist = (userId) => {
  const raw = localStorage.getItem(getWishlistKey(userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const getProductImage = (product = {}) => {
  if (product.image_url) return product.image_url;

  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0];
    if (typeof firstImage === 'string') return firstImage;
    if (firstImage?.url) return firstImage.url;
  }

  return '';
};

const migrateLegacyWishlistIfNeeded = (userId) => {
  const targetKey = getWishlistKey(userId);
  if (localStorage.getItem(targetKey)) return;

  const legacyRaw = localStorage.getItem(LEGACY_WISHLIST_KEY);
  if (!legacyRaw) return;

  try {
    const legacyParsed = JSON.parse(legacyRaw);
    if (!Array.isArray(legacyParsed)) {
      localStorage.removeItem(LEGACY_WISHLIST_KEY);
      return;
    }

    const mapped = legacyParsed.map((item) => ({
      ...item,
      userId: normalizeUserId(userId),
    }));

    localStorage.setItem(targetKey, JSON.stringify(mapped));
    localStorage.removeItem(LEGACY_WISHLIST_KEY);
  } catch (_) {
    localStorage.removeItem(LEGACY_WISHLIST_KEY);
  }
};

const wishlistService = {
  getWishlist: (userId) => {
    migrateLegacyWishlistIfNeeded(userId);
    const parsed = readWishlist(userId);
    const normalizedUserId = normalizeUserId(userId);
    const normalized = Array.isArray(parsed)
      ? parsed.map((item) => ({
          ...item,
          userId: item.userId ? String(item.userId) : normalizedUserId,
          image_url: item.image_url || getProductImage(item),
          images: Array.isArray(item.images) ? item.images : [],
        }))
      : [];

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(getWishlistKey(userId), JSON.stringify(normalized));
    }

    return normalized;
  },

  addToWishlist: (product, userId) => {
    const normalizedUserId = normalizeUserId(userId);
    const wishlist = wishlistService.getWishlist(normalizedUserId);
    const exists = wishlist.find(item => item.id === product.id);
    if (!exists) {
      wishlist.push({
        id: product.id,
        userId: normalizedUserId,
        name: product.name,
        price: product.price,
        image_url: getProductImage(product),
        images: Array.isArray(product.images) ? product.images : [],
        specifications: product.specifications || null,
        addedAt: new Date().toISOString(),
      });
      localStorage.setItem(getWishlistKey(normalizedUserId), JSON.stringify(wishlist));
      return { success: true, message: 'Đã thêm vào yêu thích' };
    }
    return { success: false, message: 'Sản phẩm đã có trong danh sách yêu thích' };
  },

  removeFromWishlist: (productId, userId) => {
    const normalizedUserId = normalizeUserId(userId);
    const wishlist = wishlistService.getWishlist(normalizedUserId);
    const filtered = wishlist.filter(item => item.id !== productId);
    localStorage.setItem(getWishlistKey(normalizedUserId), JSON.stringify(filtered));
    return { success: true, message: 'Đã xóa khỏi yêu thích' };
  },

  isInWishlist: (productId, userId) => {
    const wishlist = wishlistService.getWishlist(userId);
    return wishlist.some(item => item.id === productId);
  },

  clearWishlist: (userId) => {
    localStorage.removeItem(getWishlistKey(userId));
    return { success: true, message: 'Đã xóa tất cả' };
  },

  upsertWishlistItem: (product, userId) => {
    const normalizedUserId = normalizeUserId(userId);
    const wishlist = wishlistService.getWishlist(normalizedUserId);
    const mappedItem = {
      id: product.id,
      userId: normalizedUserId,
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

    localStorage.setItem(getWishlistKey(normalizedUserId), JSON.stringify(wishlist));
    return { success: true };
  },

  getWishlistCount: (userId) => {
    return wishlistService.getWishlist(userId).length;
  },
};

export default wishlistService;
