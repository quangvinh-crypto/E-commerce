import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { getImageUrl } from '../../utils/imageHelper';
import toast from 'react-hot-toast';

const ProductCard = ({ product }) => {
  const { addToCart, isInCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
      navigate(`/login?redirect=/products/${product.id}`);
      return;
    }
    const defaultVariant = Array.isArray(product.variants)
      ? product.variants.find((variant) => variant.isActive !== false && Number(variant.quantity || 0) > 0)
      : null;
    addToCart(product, 1, { variantId: defaultVariant?.id || defaultVariant?._id || null });
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm vào yêu thích');
      navigate(`/login?redirect=/products/${product.id}`);
      return;
    }
    if (isInWishlist(product.id)) {
      const result = await removeFromWishlist(product.id);
      if (result.success) {
        toast.success(result.message);
      }
    } else {
      const result = await addToWishlist(product);
      if (result.success) {
        toast.success(result.message);
      }
    }
  };

  const discountPercent = product.discount_price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  const displayPrice = product.discount_price || product.price;
  const specs = useMemo(() => {
    if (typeof product.specifications === 'string') {
      try {
        return JSON.parse(product.specifications);
      } catch (_) {
        return {};
      }
    }
    return product.specifications || {};
  }, [product.specifications]);

  const thumbnailUrl = useMemo(() => {
    if (product.images?.length > 0) {
      return getImageUrl(product.images[0]);
    }
    if (product.image_url) {
      return getImageUrl(product.image_url);
    }
    return 'https://via.placeholder.com/300?text=No+Image';
  }, [product.images, product.image_url]);
  const ram = specs.ram || specs.memory || '';
  const rom = specs.storage || specs.rom || '';

  return (
    <Link
      to={`/products/${product.id}`}
      className="group relative bg-zinc-900 border border-gray-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-amber-500 hover:-translate-y-1 flex flex-col h-full"
    >
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {product.discount_price && (
          <span className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
            -{discountPercent}%
          </span>
        )}
        {product.is_new && (
          <span className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
            NEW
          </span>
        )}
      </div>

      <button
        onClick={handleToggleWishlist}
        className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-all duration-300 ${
          isInWishlist(product.id)
            ? 'bg-red-500 text-white'
            : 'bg-black/50 text-white hover:bg-red-500'
        }`}
      >
        <Heart size={18} fill={isInWishlist(product.id) ? 'currentColor' : 'none'} />
      </button>

      <div className="relative overflow-hidden bg-zinc-800 aspect-square flex-shrink-0">
        <img
          src={thumbnailUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/300?text=No+Image'; }}
        />
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          {product.category_name || 'Uncategorized'}
        </p>
        <h3 className="text-lg font-semibold text-gray-100 mb-3 line-clamp-2 min-h-[3.5rem]">
          {product.name}
        </h3>
        <div className="text-sm text-gray-400 mb-4 h-[1.5rem] flex items-center gap-2">
          <span>{ram ? `RAM ${ram}` : 'RAM -'}</span>
          <span className="text-gray-600">|</span>
          <span>{rom ? `ROM ${rom}` : 'ROM -'}</span>
        </div>
        <div className="flex items-center gap-2 mb-4 mt-auto">
          <span className="text-2xl font-bold text-amber-500">
            {displayPrice.toLocaleString('vi-VN')}₫
          </span>
          {product.discount_price && (
            <span className="text-sm text-gray-500 line-through">
              {product.price.toLocaleString('vi-VN')}₫
            </span>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          className={`w-full font-semibold py-3 transition-colors flex items-center justify-center gap-2 rounded-lg ${
            isInCart(product.id)
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-amber-500 text-black hover:bg-amber-400'
          }`}
        >
          <ShoppingCart size={18} />
          {isInCart(product.id) ? 'Đã thêm' : 'Thêm vào giỏ'}
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;
