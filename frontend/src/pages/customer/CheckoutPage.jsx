import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, Banknote } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import orderService from '../../services/orderService';
import paymentService from '../../services/paymentService';
import toast from 'react-hot-toast';

const CheckoutPage = () => {
  const { cart, getCartTotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: user?.email || '', phone: '', fullName: user?.name || '', address: '', city: '', district: '', paymentMethod: 'cod', agreeTerms: false });
  const [loading, setLoading] = useState(false);
  const subtotal = getCartTotal();
  const shippingFee = subtotal > 500000 ? 0 : 30000;
  const tax = subtotal * 0.1;
  const total = subtotal + shippingFee + tax;

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để tiếp tục thanh toán');
      navigate('/login?redirect=/checkout');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agreeTerms) { toast.error('Vui lòng đồng ý với điều khoản'); return; }
    try {
      setLoading(true);
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
        items: cart.map(i => ({
          productId: i.id,
          quantity: i.quantity,
        })),
        shippingFee,
        tax,
      };
      const res = await orderService.createOrder(orderData);
      if (res.success) {
        if (formData.paymentMethod === 'vnpay') {
          const paymentRes = await paymentService.createVNPayPayment(res.data.id);
          if (paymentRes.success) {
            clearCart();
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
                  <label className={`flex items-center p-4 border rounded-lg cursor-pointer ${formData.paymentMethod === 'credit_card' ? 'border-amber-500 bg-amber-500/10' : 'border-gray-700'}`}><input type="radio" name="paymentMethod" value="credit_card" checked={formData.paymentMethod === 'credit_card'} onChange={handleChange} className="text-amber-500" /><CreditCard size={24} className="mx-4 text-gray-400" /><div><div className="font-medium text-gray-100">Thẻ tín dụng / Ghi nợ</div></div></label>
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gray-100 mb-6">Đơn Hàng</h2>
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">{cart.map((item) => <div key={item.id} className="flex gap-3"><img src={item.image_url || 'https://via.placeholder.com/60'} alt={item.name} className="w-16 h-16 object-cover rounded-lg" /><div className="flex-1"><p className="font-medium text-gray-100 line-clamp-1">{item.name}</p><p className="text-sm text-gray-400">x{item.quantity}</p><p className="text-amber-500">{((item.discount_price || item.price) * item.quantity).toLocaleString('vi-VN')}₫</p></div></div>)}</div>
                <div className="space-y-3 border-t border-gray-800 pt-4 mb-6">
                  <div className="flex justify-between text-gray-400"><span>Tạm tính:</span><span className="text-gray-300">{subtotal.toLocaleString('vi-VN')}₫</span></div>
                  <div className="flex justify-between text-gray-400"><span>Phí vận chuyển:</span><span>{shippingFee === 0 ? <span className="text-green-400">Miễn phí</span> : `${shippingFee.toLocaleString('vi-VN')}₫`}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Thuế VAT:</span><span className="text-gray-300">{tax.toLocaleString('vi-VN')}₫</span></div>
                  <div className="border-t border-gray-800 pt-3 flex justify-between text-lg font-bold text-gray-100"><span>Tổng:</span><span className="text-amber-500">{total.toLocaleString('vi-VN')}₫</span></div>
                </div>
                <label className="flex items-start gap-2 mb-6 cursor-pointer"><input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} className="mt-1 text-amber-500 rounded" /><span className="text-sm text-gray-400">Tôi đồng ý với <a href="#" className="text-amber-500">điều khoản</a></span></label>
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
