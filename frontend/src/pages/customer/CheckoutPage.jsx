import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Banknote } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import orderService from '../../services/orderService';
import couponService from '../../services/couponService';
import paymentService from '../../services/paymentService';
import { getImageUrl } from '../../utils/imageHelper';
import toast from 'react-hot-toast';

const CheckoutPage = () => {
  const { cart, getCartTotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: user?.email || '', phone: '', fullName: user?.name || '', address: '', city: '', district: '', paymentMethod: 'cod', agreeTerms: false });
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const subtotal = getCartTotal();
  const shippingFee = subtotal > 500000 ? 0 : 30000;
  const tax = subtotal * 0.1;
  const discount = appliedCoupon?.discountAmount || 0;
  const total = Math.max(0, subtotal + shippingFee + tax - discount);
  const getItemId = (item) => item.id || item._id || item.productId || item.product_id;
  const getItemUnitPrice = (item) => {
    const discountPrice = Number(item.discount_price);
    const price = Number(item.price);
    return Number.isFinite(discountPrice) && discountPrice > 0 ? discountPrice : price;
  };
  const getCartItemImage = (item) => {
    if (item.images?.length > 0) {
      return getImageUrl(item.images[0], 'https://via.placeholder.com/60?text=No+Image');
    }
    if (item.image_url) {
      return getImageUrl(item.image_url, 'https://via.placeholder.com/60?text=No+Image');
    }
    return 'https://via.placeholder.com/60?text=No+Image';
  };

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để tiếp tục thanh toán');
      navigate('/login?redirect=/checkout');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setAppliedCoupon(null);
  }, [subtotal]);

  const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Vui lòng nhập mã giảm giá');
      return;
    }

    try {
      setApplyingCoupon(true);
      const res = await couponService.validateCoupon(couponCode.trim(), subtotal);
      if (res.success) {
        setAppliedCoupon({
          code: res.data.coupon.code,
          discountAmount: res.data.discountAmount,
          description: res.data.coupon.description,
        });
        setCouponCode(res.data.coupon.code);
        toast.success('Áp dụng mã giảm giá thành công');
      } else {
        setAppliedCoupon(null);
        toast.error(res.message || 'Mã giảm giá không hợp lệ');
      }
    } catch (error) {
      setAppliedCoupon(null);
      toast.error(error.response?.data?.message || 'Mã giảm giá không hợp lệ');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agreeTerms) { toast.error('Vui lòng đồng ý với điều khoản'); return; }
    try {
      setLoading(true);
      const orderItems = cart
        .map((item) => ({
          productId: getItemId(item),
          quantity: item.quantity,
        }))
        .filter((item) => item.productId);

      if (orderItems.length !== cart.length) {
        toast.error('Một số sản phẩm trong giỏ hàng không hợp lệ, vui lòng cập nhật lại giỏ hàng');
        setLoading(false);
        return;
      }

      const orderData = {
        shippingAddress: {
          name: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          email: formData.email,
        },
        paymentMethod: formData.paymentMethod,
        items: orderItems,
        shippingFee,
        tax,
        couponCode: appliedCoupon?.code || undefined,
      };
      const res = await orderService.createOrder(orderData);
      if (res.success) {
        if (formData.paymentMethod === 'vnpay') {
          const paymentRes = await paymentService.createVNPayPayment(res.data.id);
          if (paymentRes.success) {
            sessionStorage.setItem('pending_vnpay_order_id', res.data.id);
            window.location.href = paymentRes.data.paymentUrl;
            return;
          } else {
            toast.error('Không thể tạo thanh toán VNPay');
          }
        } else {
          toast.success('Đặt hàng thành công!');
          clearCart();
          navigate('/profile/orders');
        }
      }
      else toast.error(res.message || 'Có lỗi xảy ra');
    } catch (e) { toast.error(e.response?.data?.message || 'Có lỗi xảy ra'); }
    finally { setLoading(false); }
  };

  if (cart.length === 0) { navigate('/cart'); return null; }

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-8">Thanh Toán</h1>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4">Thông Tin Liên Hệ</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-300 mb-2">Họ và tên *</label><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-300 mb-2">Email *</label><input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg" /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300 mb-2">Số điện thoại *</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg" /></div>
                </div>
              </div>
              <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4">Địa Chỉ Giao Hàng</h2>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-300 mb-2">Địa chỉ *</label><input type="text" name="address" value={formData.address} onChange={handleChange} required className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-300 mb-2">Thành phố *</label><input type="text" name="city" value={formData.city} onChange={handleChange} required className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-gray-300 mb-2">Quận/Huyện *</label><input type="text" name="district" value={formData.district} onChange={handleChange} required className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg" /></div>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4">Phương Thức Thanh Toán</h2>
                <div className="space-y-3">
                  <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${formData.paymentMethod === 'cod' ? 'border-amber-500 bg-amber-500/10' : 'border-gray-700'}`}><input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={handleChange} className="text-amber-500" /><Wallet size={24} className="mx-4 text-gray-400" /><div><div className="font-medium text-gray-100">Thanh toán khi nhận hàng (COD)</div></div></label>
                  <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${formData.paymentMethod === 'vnpay' ? 'border-amber-500 bg-amber-500/10' : 'border-gray-700'}`}><input type="radio" name="paymentMethod" value="vnpay" checked={formData.paymentMethod === 'vnpay'} onChange={handleChange} className="text-amber-500" /><Banknote size={24} className="mx-4 text-gray-400" /><div><div className="font-medium text-gray-100">Thanh toán qua VNPay</div><div className="text-sm text-gray-400">ATM, Visa, MasterCard, QR Code</div></div></label>
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-100 mb-6">Đơn Hàng</h2>
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">{cart.map((item) => <div key={getItemId(item)} className="flex gap-3"><img src={getCartItemImage(item)} alt={item.name} className="w-16 h-16 object-cover rounded-lg" onError={(e) => { e.target.src = 'https://via.placeholder.com/60?text=No+Image'; }} /><div className="flex-1"><p className="font-medium text-gray-100 line-clamp-1">{item.name}</p><p className="text-sm text-gray-400">x{item.quantity}</p><p className="text-amber-500">{(getItemUnitPrice(item) * item.quantity).toLocaleString('vi-VN')}₫</p></div></div>)}</div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Mã giảm giá</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setAppliedCoupon(null);
                      }}
                      placeholder="Nhập mã coupon"
                      className="flex-1 px-4 py-2 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={applyingCoupon || !couponCode.trim()}
                      className="px-4 py-2 bg-amber-500 text-black rounded-lg font-semibold disabled:opacity-50"
                    >
                      {applyingCoupon ? 'Đang kiểm tra...' : 'Áp dụng'}
                    </button>
                  </div>
                  {appliedCoupon && <p className="text-sm text-green-400 mt-2">Đã áp dụng mã {appliedCoupon.code}{appliedCoupon.description ? ` - ${appliedCoupon.description}` : ''}</p>}
                </div>
                <div className="space-y-3 border-t border-gray-800 pt-4 mb-6">
                  <div className="flex justify-between text-gray-400"><span>Tạm tính:</span><span className="text-gray-300">{subtotal.toLocaleString('vi-VN')}₫</span></div>
                  <div className="flex justify-between text-gray-400"><span>Phí vận chuyển:</span><span>{shippingFee === 0 ? <span className="text-green-400">Miễn phí</span> : `${shippingFee.toLocaleString('vi-VN')}₫`}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Thuế VAT:</span><span className="text-gray-300">{tax.toLocaleString('vi-VN')}₫</span></div>
                  {discount > 0 && <div className="flex justify-between text-green-400"><span>Giảm giá:</span><span>-{discount.toLocaleString('vi-VN')}₫</span></div>}
                  <div className="border-t border-gray-800 pt-3 flex justify-between text-lg font-bold text-gray-100"><span>Tổng:</span><span className="text-amber-500">{total.toLocaleString('vi-VN')}₫</span></div>
                </div>
                <label className="flex items-start gap-2 mb-6 cursor-pointer"><input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} className="mt-1 text-amber-500 rounded" /><span className="text-sm text-gray-400">Tôi đồng ý với <span className="text-amber-500">điều khoản</span></span></label>
                <button type="submit" disabled={loading} className="w-full bg-amber-500 text-black py-4 rounded-full font-semibold hover:bg-amber-400 disabled:opacity-50">{loading ? 'Đang xử lý...' : 'Đặt Hàng'}</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </CustomerLayout>
  );
};

export default CheckoutPage;
