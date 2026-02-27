import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const subtotal = getCartTotal();
  const shippingFee = subtotal > 500000 ? 0 : 30000;
  const tax = subtotal * 0.1;
  const total = subtotal + shippingFee + tax;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để tiếp tục thanh toán');
      navigate('/login?redirect=/checkout');
      return;
    }
    navigate('/checkout');
  };

  if (cart.length === 0) return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center justify-center w-32 h-32 bg-zinc-900 border border-gray-800 rounded-full mb-6"><ShoppingBag size={64} className="text-gray-600" /></div>
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Giỏ hàng của bạn đang trống</h2>
        <p className="text-gray-400 mb-8">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm</p>
        <Link to="/products" className="inline-flex items-center gap-2 bg-amber-500 text-black px-8 py-3 rounded-full font-semibold hover:bg-amber-400">Tiếp tục mua sắm<ArrowRight size={20} /></Link>
      </div>
    </CustomerLayout>
  );

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-8">Giỏ Hàng Của Bạn</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-zinc-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-zinc-950 border-b border-gray-800 font-medium text-gray-400"><div className="col-span-6">Sản phẩm</div><div className="col-span-2 text-center">Đơn giá</div><div className="col-span-2 text-center">Số lượng</div><div className="col-span-2 text-right">Thành tiền</div></div>
              <div className="divide-y divide-gray-800">
                {cart.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-6 flex gap-4"><img src={item.image_url || 'https://via.placeholder.com/100'} alt={item.name} className="w-20 h-20 object-cover rounded-lg" /><div className="flex-1"><Link to={`/products/${item.id}`} className="font-medium text-gray-100 hover:text-amber-500 line-clamp-2">{item.name}</Link><p className="text-sm text-gray-500 mt-1">{item.category_name}</p></div></div>
                      <div className="md:col-span-2 text-center"><span className="font-medium text-gray-300">{(item.discount_price || item.price).toLocaleString('vi-VN')}₫</span></div>
                      <div className="md:col-span-2 flex justify-center">
                        <div className="flex items-center bg-zinc-800 border border-gray-700 rounded-lg">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 text-gray-400 hover:text-gray-100"><Minus size={16} /></button>
                          <input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)} className="w-12 text-center bg-transparent text-gray-100 border-x border-gray-700" />
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 text-gray-400 hover:text-gray-100"><Plus size={16} /></button>
                        </div>
                      </div>
                      <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-4"><span className="font-semibold text-amber-500">{((item.discount_price || item.price) * item.quantity).toLocaleString('vi-VN')}₫</span><button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-400"><Trash2 size={20} /></button></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-zinc-950 border-t border-gray-800 flex justify-between"><Link to="/products" className="text-amber-500 hover:text-amber-400 font-medium">← Tiếp tục mua sắm</Link><button onClick={clearCart} className="text-red-500 hover:text-red-400 font-medium">Xóa tất cả</button></div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-100 mb-6">Tổng Đơn Hàng</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-400"><span>Tạm tính:</span><span className="text-gray-300">{subtotal.toLocaleString('vi-VN')}₫</span></div>
                <div className="flex justify-between text-gray-400"><span>Phí vận chuyển:</span><span>{shippingFee === 0 ? <span className="text-green-400">Miễn phí</span> : <span className="text-gray-300">{shippingFee.toLocaleString('vi-VN')}₫</span>}</span></div>
                <div className="flex justify-between text-gray-400"><span>Thuế VAT (10%):</span><span className="text-gray-300">{tax.toLocaleString('vi-VN')}₫</span></div>
                <div className="border-t border-gray-800 pt-3 flex justify-between text-lg font-bold text-gray-100"><span>Tổng cộng:</span><span className="text-amber-500">{total.toLocaleString('vi-VN')}₫</span></div>
              </div>
              <button onClick={handleCheckout} className="w-full bg-amber-500 text-black py-3 rounded-full font-semibold hover:bg-amber-400 flex items-center justify-center gap-2">Tiến hành thanh toán<ArrowRight size={20} /></button>
              {shippingFee > 0 && <p className="text-sm text-gray-400 mt-4 text-center">Mua thêm {(500000 - subtotal).toLocaleString('vi-VN')}₫ để được miễn phí vận chuyển</p>}
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CartPage;
