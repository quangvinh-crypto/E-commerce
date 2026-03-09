import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import { getImageUrl } from '../../utils/imageHelper';
import toast from 'react-hot-toast';

const WishlistPage = () => {
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [removing, setRemoving] = useState(null);

  const handleRemove = async (productId) => {
    setRemoving(productId);
    const result = await removeFromWishlist(productId);
    if (result.success) {
      toast.success(result.message);
    }
    setRemoving(null);
  };

  const handleAddToCart = (product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: getWishlistImage(product),
      images: product.images,
      quantity: 1,
    });
  };

  const handleClearAll = async () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả sản phẩm yêu thích?')) {
      const result = await clearWishlist();
      if (result.success) {
        toast.success(result.message);
      }
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const getWishlistImage = (product) => {
    if (product.images?.length > 0) {
      return getImageUrl(product.images[0], 'https://via.placeholder.com/400?text=No+Image');
    }
    if (product.image_url) {
      return getImageUrl(product.image_url, 'https://via.placeholder.com/400?text=No+Image');
    }
    return 'https://via.placeholder.com/400?text=No+Image';
  };

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/products"
              className="p-2 text-gray-400 hover:text-amber-500 transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
                <Heart className="text-amber-500" size={32} />
                Sản Phẩm Yêu Thích
              </h1>
              <p className="text-gray-400 mt-1">{wishlist.length} sản phẩm</p>
            </div>
          </div>
          {wishlist.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {wishlist.length === 0 ? (
          <div className="bg-zinc-900 border border-gray-800 rounded-xl p-12 text-center">
            <Heart size={64} className="mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-300 mb-2">
              Chưa có sản phẩm yêu thích
            </h2>
            <p className="text-gray-500 mb-6">
              Hãy thêm sản phẩm vào danh sách yêu thích để theo dõi và mua sau
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 bg-amber-500 text-black px-6 py-3 rounded-full font-semibold hover:bg-amber-400 transition-colors"
            >
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wishlist.map((product) => (
              <div
                key={product.id}
                className="bg-zinc-900 border border-gray-800 rounded-xl overflow-hidden group hover:border-amber-500/50 transition-colors"
              >
                <Link to={`/products/${product.id}`} className="block relative">
                  <div className="aspect-square bg-zinc-800 overflow-hidden">
                    <img
                      src={getWishlistImage(product)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400?text=No+Image';
                      }}
                    />
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemove(product.id);
                    }}
                    disabled={removing === product.id}
                    className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </Link>
                <div className="p-4">
                  <Link to={`/products/${product.id}`}>
                    <h3 className="font-semibold text-gray-100 mb-2 line-clamp-2 hover:text-amber-500 transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-amber-500 font-bold text-lg mb-4">
                    {formatPrice(product.price)}
                  </p>
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 text-black py-2.5 rounded-lg font-semibold hover:bg-amber-400 transition-colors"
                  >
                    <ShoppingCart size={18} />
                    Thêm vào giỏ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default WishlistPage;
