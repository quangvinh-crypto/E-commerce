import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Minus, Plus, ChevronRight, Cpu, Battery, Smartphone, HardDrive, Camera, Wifi, MessageSquare, Send } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import { ProductCard } from '../../components/features';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import productService from '../../services/productService';
import reviewService from '../../services/reviewService';
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
  const { isAuthenticated, user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [reviewPagination, setReviewPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [replyMap, setReplyMap] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState('');
  const [activeReplyId, setActiveReplyId] = useState('');
  const [editingReviewId, setEditingReviewId] = useState('');
  const [editingReplyId, setEditingReplyId] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [submittingEditId, setSubmittingEditId] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    fetchReviews();
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
        setRelatedProducts((relRes.data || []).filter((p) => p.id !== id));
      }
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải thông tin sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (page = 1) => {
    try {
      setLoadingReviews(true);
      const res = await reviewService.getProductReviews(id, { page, limit: 10 });
      setReviews(res.data || []);
      setReviewPagination(res.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải bình luận sản phẩm');
    } finally {
      setLoadingReviews(false);
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

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm vào yêu thích');
      navigate(`/login?redirect=/products/${id}`);
      return;
    }
    if (product && isInWishlist(product.id)) {
      const result = await removeFromWishlist(product.id);
      if (result.success) {
        toast.success(result.message);
      }
    } else if (product) {
      const result = await addToWishlist(product);
      if (result.success) {
        toast.success(result.message);
      }
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để đánh giá sản phẩm');
      navigate(`/login?redirect=/products/${id}`);
      return;
    }

    if (!reviewComment.trim()) {
      toast.error('Vui lòng nhập nội dung đánh giá');
      return;
    }

    try {
      setSubmittingReview(true);
      await reviewService.createProductReview(id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewComment('');
      toast.success('Đánh giá đã được gửi');
      await Promise.all([fetchProduct(), fetchReviews(reviewPagination.page || 1)]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể gửi đánh giá');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitReply = async (parentId) => {
    const content = (replyMap[parentId] || '').trim();
    if (!content) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để phản hồi');
      navigate(`/login?redirect=/products/${id}`);
      return;
    }

    try {
      setSubmittingReplyId(parentId);
      await reviewService.createProductReview(id, {
        parentId,
        comment: content,
      });
      setReplyMap((prev) => ({ ...prev, [parentId]: '' }));
      setActiveReplyId('');
      toast.success('Đã gửi phản hồi');
      await fetchReviews(reviewPagination.page || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể gửi phản hồi');
    } finally {
      setSubmittingReplyId('');
    }
  };

  const isOwner = (item) => {
    if (!isAuthenticated || !user?.id) return false;
    const ownerId = item?.userId || item?.user?.id;
    return ownerId ? String(ownerId) === String(user.id) : false;
  };

  const handleToggleReply = (reviewId) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để phản hồi');
      navigate(`/login?redirect=/products/${id}`);
      return;
    }
    setActiveReplyId((prev) => (prev === reviewId ? '' : reviewId));
  };

  const startEditReview = (review) => {
    setEditingReplyId('');
    setEditingReviewId(review.id);
    setEditComment(review.comment || '');
    setEditRating(Number(review.rating || 5));
  };

  const startEditReply = (reply) => {
    setEditingReviewId('');
    setEditingReplyId(reply.id);
    setEditComment(reply.comment || '');
  };

  const cancelEdit = () => {
    setEditingReviewId('');
    setEditingReplyId('');
    setEditComment('');
    setEditRating(5);
  };

  const handleUpdateReview = async (reviewId, isRoot = true) => {
    if (!editComment.trim()) {
      toast.error('Nội dung không được để trống');
      return;
    }

    try {
      setSubmittingEditId(reviewId);
      await reviewService.updateReview(reviewId, {
        comment: editComment.trim(),
        ...(isRoot ? { rating: editRating } : {}),
      });
      toast.success('Đã cập nhật bình luận');
      cancelEdit();
      if (isRoot) {
        await Promise.all([fetchProduct(), fetchReviews(reviewPagination.page || 1)]);
      } else {
        await fetchReviews(reviewPagination.page || 1);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật bình luận');
    } finally {
      setSubmittingEditId('');
    }
  };

  const handleDeleteReview = async (reviewId, isRoot = true) => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
      await reviewService.deleteReview(reviewId);
      toast.success('Đã xóa bình luận');
      if (isRoot) {
        await Promise.all([fetchProduct(), fetchReviews(reviewPagination.page || 1)]);
      } else {
        await fetchReviews(reviewPagination.page || 1);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xóa bình luận');
    }
  };

  const formatDateTime = (dateValue) => {
    return new Date(dateValue).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
                    className={i < Math.round(product.ratingAverage || product.rating || 0) ? 'fill-amber-500 text-amber-500' : 'text-gray-600'}
                  />
                ))}
              </div>
              <span className="text-gray-400">
                {(product.ratingAverage || product.rating || 0).toFixed(1)} ({product.ratingCount || product.review_count || 0} đánh giá)
              </span>
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

        <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6 mb-12">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare size={22} className="text-amber-500" />
              <h2 className="text-xl font-bold text-gray-100">Đánh giá & bình luận</h2>
            </div>
            <p className="text-sm text-gray-400">Tổng {product.ratingCount || 0} đánh giá</p>
          </div>

          <div className="bg-zinc-950 border border-gray-800 rounded-xl p-4 mb-6">
            <h3 className="text-gray-100 font-semibold mb-3">Viết đánh giá của bạn</h3>
            <div className="flex items-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={20}
                    className={star <= reviewRating ? 'fill-amber-500 text-amber-500' : 'text-gray-600'}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={4}
              placeholder={isAuthenticated ? 'Chia sẻ cảm nhận của bạn về sản phẩm này...' : 'Đăng nhập để đánh giá sản phẩm'}
              disabled={!isAuthenticated || submittingReview}
              className="w-full bg-zinc-900 border border-gray-700 rounded-lg p-3 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
            />
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={!isAuthenticated || submittingReview}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg font-semibold hover:bg-amber-400 disabled:opacity-60"
              >
                <Send size={16} />
                {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </div>

          {loadingReviews ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Chưa có đánh giá nào cho sản phẩm này</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-zinc-950 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="text-gray-100 font-semibold">{review.user?.name || 'Khách hàng'}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(review.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={star <= Number(review.rating || 0) ? 'fill-amber-500 text-amber-500' : 'text-gray-700'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-300 mb-3 whitespace-pre-line">{review.comment}</p>

                  <div className="flex items-center gap-4 text-sm mb-3">
                    <button
                      type="button"
                      onClick={() => handleToggleReply(review.id)}
                      className="text-amber-500 hover:text-amber-400"
                    >
                      Trả lời
                    </button>
                    {isOwner(review) && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditReview(review)}
                          className="text-gray-400 hover:text-gray-200"
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(review.id, true)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Xóa
                        </button>
                      </>
                    )}
                  </div>

                  {editingReviewId === review.id && (
                    <div className="mb-3 bg-zinc-900 border border-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEditRating(star)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              size={16}
                              className={star <= editRating ? 'fill-amber-500 text-amber-500' : 'text-gray-600'}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        rows={3}
                        className="w-full bg-zinc-950 border border-gray-700 rounded-lg p-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-sm px-3 py-1.5 border border-gray-600 text-gray-300 rounded-lg"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateReview(review.id, true)}
                          disabled={submittingEditId === review.id}
                          className="text-sm px-3 py-1.5 bg-amber-500 text-black rounded-lg font-semibold disabled:opacity-60"
                        >
                          {submittingEditId === review.id ? 'Đang lưu...' : 'Lưu'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeReplyId === review.id && (
                    <div className="mb-3">
                      <textarea
                        value={replyMap[review.id] || ''}
                        onChange={(e) => setReplyMap((prev) => ({ ...prev, [review.id]: e.target.value }))}
                        rows={2}
                        placeholder="Trả lời bình luận này..."
                        disabled={submittingReplyId === review.id}
                        className="w-full bg-zinc-900 border border-gray-700 rounded-lg p-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setActiveReplyId('')}
                          className="text-sm px-3 py-1.5 border border-gray-600 text-gray-300 rounded-lg"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitReply(review.id)}
                          disabled={submittingReplyId === review.id}
                          className="text-sm px-3 py-1.5 border border-amber-500 text-amber-500 rounded-lg hover:bg-amber-500/10 disabled:opacity-60"
                        >
                          {submittingReplyId === review.id ? 'Đang gửi...' : 'Gửi trả lời'}
                        </button>
                      </div>
                    </div>
                  )}

                  {review.replies?.length > 0 && (
                    <div className="space-y-2 border-l border-gray-700 pl-4">
                      {review.replies.map((reply) => (
                        <div key={reply.id} className="bg-zinc-900/70 border border-gray-800 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-200">{reply.user?.name || 'Khách hàng'}</p>
                            <p className="text-xs text-gray-500">{formatDateTime(reply.createdAt)}</p>
                          </div>
                          <p className="text-sm text-gray-400 whitespace-pre-line mb-2">{reply.comment}</p>

                          {isOwner(reply) && (
                            <div className="flex items-center gap-4 text-xs mb-2">
                              <button
                                type="button"
                                onClick={() => startEditReply(reply)}
                                className="text-gray-400 hover:text-gray-200"
                              >
                                Chỉnh sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(reply.id, false)}
                                className="text-red-400 hover:text-red-300"
                              >
                                Xóa
                              </button>
                            </div>
                          )}

                          {editingReplyId === reply.id && (
                            <div className="bg-zinc-950 border border-gray-700 rounded-lg p-2">
                              <textarea
                                value={editComment}
                                onChange={(e) => setEditComment(e.target.value)}
                                rows={2}
                                className="w-full bg-zinc-900 border border-gray-700 rounded-lg p-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="text-xs px-2.5 py-1 border border-gray-600 text-gray-300 rounded-lg"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReview(reply.id, false)}
                                  disabled={submittingEditId === reply.id}
                                  className="text-xs px-2.5 py-1 bg-amber-500 text-black rounded-lg font-semibold disabled:opacity-60"
                                >
                                  {submittingEditId === reply.id ? 'Đang lưu...' : 'Lưu'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {reviewPagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => fetchReviews(Math.max(1, reviewPagination.page - 1))}
                    disabled={reviewPagination.page <= 1}
                    className="px-3 py-1.5 rounded border border-gray-700 text-gray-300 disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <span className="px-2 py-1.5 text-sm text-gray-400">
                    Trang {reviewPagination.page}/{reviewPagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchReviews(Math.min(reviewPagination.totalPages, reviewPagination.page + 1))}
                    disabled={reviewPagination.page >= reviewPagination.totalPages}
                    className="px-3 py-1.5 rounded border border-gray-700 text-gray-300 disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          )}
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
