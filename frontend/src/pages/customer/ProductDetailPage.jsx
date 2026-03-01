import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Minus, Plus, ChevronRight, Cpu, Battery, Smartphone, HardDrive, Camera, Wifi } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import { ProductCard } from '../../components/features';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import productService from '../../services/productService';
import { getImageUrl } from '../../utils/imageHelper';
import toast from 'react-hot-toast';

const specLabels = {
  brand: 'Thương hiệu',
  screen: 'Màn hình',
  os: 'Hệ điều hành',
  cpu: 'CPU',
  ram: 'RAM',
  storage: 'Bộ nhớ trong',
  camera: 'Camera sau',
  frontCamera: 'Camera trước',
  battery: 'Pin',
  charging: 'Sạc',
  sim: 'SIM',
  connectivity: 'Kết nối',
  weight: 'Trọng lượng',
  dimensions: 'Kích thước',
  material: 'Chất liệu',
  waterproof: 'Chống nước',
  color: 'Màu sắc',
  warranty: 'Bảo hành',
};

const specIcons = {
  screen: <Smartphone size={18} />,
  cpu: <Cpu size={18} />,
  ram: <HardDrive size={18} />,
  storage: <HardDrive size={18} />,
  battery: <Battery size={18} />,
  camera: <Camera size={18} />,
  connectivity: <Wifi size={18} />,
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const imageList =
      product.images?.length > 0
        ? product.images.map((img) => getImageUrl(img))
        : product.image_url
        ? [getImageUrl(product.image_url)]
        : ['https://via.placeholder.com/600'];

    setSelectedImage(imageList[0]);
  }, [product]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await productService.getProductById(id);
      setProduct(res.data);
      if (res.data.category_id || res.data.categoryId) {
        const catId = res.data.category_id || res.data.categoryId;
        const relRes = await productService.getProducts({ categoryId: catId, limit: 4 });
        setRelatedProducts((relRes.data || []).filter((p) => p.id !== parseInt(id)));
      }
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải thông tin sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
      navigate(`/login?redirect=/products/${id}`);
      return;
    }
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để mua hàng');
      navigate(`/login?redirect=/products/${id}`);
      return;
    }
    addToCart(product, quantity);
    navigate('/cart');
  };

  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm vào yêu thích');
      navigate(`/login?redirect=/products/${id}`);
      return;
    }
    if (product && isInWishlist(product.id)) {
      removeFromWishlist(product.id);
      toast.success('Đã xóa khỏi yêu thích');
    } else if (product) {
      addToWishlist(product);
      toast.success('Đã thêm vào yêu thích');
    }
  };

  const getSpecifications = () => {
    if (!product?.specifications) return null;
    if (typeof product.specifications === 'string') {
      try {
        return JSON.parse(product.specifications);
      } catch (_) {
        return {};
      }
    }
    return product.specifications;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + '₫';
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      </CustomerLayout>
    );
  }

  if (!product) {
    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Không tìm thấy sản phẩm</h2>
          <Link to="/products" className="text-amber-500 hover:text-amber-400">
            Quay lại danh sách sản phẩm
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const images =
    product.images?.length > 0
      ? product.images.map((img) => getImageUrl(img))
      : product.image_url
      ? [getImageUrl(product.image_url)]
      : ['https://via.placeholder.com/600'];
  const thumbnailImages = images.slice(0, 4);
  const mainImage = selectedImage || images[0];

  const displayPrice = product.discount_price || product.price;
  const discountPercent = product.discount_price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  const specifications = getSpecifications();
  const highlightSpecs = specifications
    ? ['screen', 'cpu', 'ram', 'storage', 'battery', 'camera'].filter((key) => specifications[key])
    : [];

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-amber-500">Trang chủ</Link>
          <ChevronRight size={16} />
          <Link to="/products" className="hover:text-amber-500">Sản phẩm</Link>
          <ChevronRight size={16} />
          <span className="text-gray-100 line-clamp-1">{product.name}</span>
        </div>

        {/* Product Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Images */}
          <div>
            <div className="bg-zinc-900 border border-gray-800 rounded-xl overflow-hidden mb-4">
              <img
                src={mainImage}
                alt={product.name}
                className="w-full aspect-square object-cover"
              />
            </div>
            {thumbnailImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {thumbnailImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`border-2 rounded-lg overflow-hidden transition-colors ${
                      mainImage === img ? 'border-amber-500' : 'border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-20 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-bold text-gray-100 mb-4">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className={i < Math.floor(product.rating || 4) ? 'fill-amber-500 text-amber-500' : 'text-gray-600'}
                  />
                ))}
              </div>
              <span className="text-gray-400">({product.review_count || 0} đánh giá)</span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl font-bold text-amber-500">{formatPrice(displayPrice)}</span>
              {product.discount_price && (
                <>
                  <span className="text-xl text-gray-500 line-through">{formatPrice(product.price)}</span>
                  <span className="bg-amber-500 text-black px-3 py-1 rounded-full text-sm font-bold">
                    -{discountPercent}%
                  </span>
                </>
              )}
            </div>

            {/* Quick Specs */}
            {highlightSpecs.length > 0 && (
              <div className="bg-zinc-900/50 border border-gray-800 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  {highlightSpecs.map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-amber-500">{specIcons[key] || <ChevronRight size={18} />}</span>
                      <span className="text-gray-400 text-sm">{specLabels[key]}:</span>
                      <span className="text-gray-100 text-sm font-medium">{specifications[key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock */}
            <div className="mb-6">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  (product.stock || product.quantity) > 0
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {(product.stock || product.quantity) > 0
                  ? `Còn ${product.stock || product.quantity} sản phẩm`
                  : 'Hết hàng'}
              </span>
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Số lượng</label>
              <div className="flex items-center bg-zinc-900 border border-gray-800 rounded-lg w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-gray-400 hover:text-gray-100 transition-colors"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center bg-transparent text-gray-100 border-x border-gray-800"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 text-gray-400 hover:text-gray-100 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={handleAddToCart}
                disabled={!(product.stock || product.quantity)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-amber-500 text-amber-500 rounded-lg font-semibold hover:bg-amber-500/10 disabled:opacity-50 transition-colors"
              >
                <ShoppingCart size={20} />
                Thêm vào giỏ
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!(product.stock || product.quantity)}
                className="flex-1 px-6 py-4 bg-amber-500 text-black rounded-lg font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                Mua ngay
              </button>
              <button
                onClick={handleToggleWishlist}
                className={`p-4 border rounded-lg transition-colors ${
                  isInWishlist(product.id)
                    ? 'border-red-500 bg-red-500/10 text-red-500'
                    : 'border-gray-800 text-gray-400 hover:bg-zinc-900 hover:text-amber-500'
                }`}
              >
                <Heart size={20} fill={isInWishlist(product.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
        </div>

        {/* Product Content Section */}
        <div className="space-y-6 mb-12">
          <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-100 mb-3">Mô tả sản phẩm</h2>
            <p className="text-gray-400 whitespace-pre-line">{product.description || 'Chưa có mô tả chi tiết.'}</p>
          </div>

          <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-100 mb-4">Thông số kỹ thuật</h2>
            {specifications && Object.keys(specifications).length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-800">
                <table className="w-full">
                  <tbody>
                    {Object.entries(specifications).map(([key, value], idx) => (
                      <tr
                        key={key}
                        className={`${idx % 2 === 0 ? 'bg-zinc-800/50' : 'bg-zinc-900'} border-b border-gray-800 last:border-b-0`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-300 w-1/3">
                          <div className="flex items-center gap-2">
                            {specIcons[key] && <span className="text-amber-500">{specIcons[key]}</span>}
                            {specLabels[key] || key}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-100">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">Chưa có thông số kỹ thuật</p>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-100 mb-6">Sản phẩm liên quan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default ProductDetailPage;
