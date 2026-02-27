import { useState, useEffect } from 'react';
import { Eye, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import orderService from '../../services/orderService';
import toast from 'react-hot-toast';

const OrderHistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try { setLoading(true); const res = await orderService.getMyOrders(); if (res.success) setOrders(res.data || []); else toast.error(res.message || 'Không thể tải đơn hàng'); } catch (e) { if (e.response?.status === 401) toast.error('Vui lòng đăng nhập'); else toast.error(e.response?.data?.message || 'Không thể tải đơn hàng'); setOrders([]); } finally { setLoading(false); }
  };

  const getStatusConfig = (status) => ({ pending: { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={16} /> }, confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800', icon: <Package size={16} /> }, processing: { label: 'Đang xử lý', color: 'bg-indigo-100 text-indigo-800', icon: <Package size={16} /> }, shipped: { label: 'Đang giao', color: 'bg-purple-100 text-purple-800', icon: <Truck size={16} /> }, delivered: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800', icon: <CheckCircle size={16} /> }, cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-800', icon: <XCircle size={16} /> }, refunded: { label: 'Đã hoàn tiền', color: 'bg-gray-200 text-gray-800', icon: <XCircle size={16} /> } }[status] || { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={16} /> });

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-8">Lịch Sử Đơn Hàng</h1>
        {loading ? <div className="flex justify-center py-20"><div className="spinner"></div></div> : orders.length === 0 ? (
          <div className="bg-zinc-900 border border-gray-800 rounded-xl p-12 text-center">
            <Package size={64} className="mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-100 mb-2">Chưa có đơn hàng nào</h2>
            <p className="text-gray-400 mb-6">Hãy mua sắm để có đơn hàng đầu tiên!</p>
            <a href="/products" className="inline-flex items-center gap-2 bg-amber-500 text-black px-6 py-3 rounded-full font-semibold hover:bg-amber-400">Mua sắm ngay</a>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => { const status = getStatusConfig(order.status); return (
              <div key={order.id} className="bg-zinc-900 border border-gray-800 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div><span className="text-gray-400">Mã đơn: </span><span className="font-semibold text-gray-100">#{order.id}</span></div>
                  <div className="flex items-center gap-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>{status.icon}{status.label}</span><button onClick={() => { setSelectedOrder(order); setShowModal(true); }} className="flex items-center gap-2 text-amber-500 hover:text-amber-400"><Eye size={18} />Chi tiết</button></div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm"><span className="text-gray-400">Ngày: <span className="text-gray-300">{new Date(order.createdAt || order.created_at || order.date).toLocaleDateString('vi-VN')}</span></span><span className="text-xl font-bold text-amber-500">{(order.total_amount || order.total || 0).toLocaleString('vi-VN')}₫</span></div>
              </div>
            ); })}
          </div>
        )}
        {showModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-800 flex items-center justify-between"><h2 className="text-2xl font-bold text-gray-100">Đơn Hàng #{selectedOrder.id}</h2><button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-100">✕</button></div>
              <div className="p-6">
                <div className="space-y-4 mb-6">{selectedOrder.items?.map((item, idx) => <div key={idx} className="flex gap-4 p-4 bg-zinc-800 rounded-lg"><img src={item.productImage || item.image_url || 'https://via.placeholder.com/80'} alt={item.productName || item.name} className="w-20 h-20 object-cover rounded" /><div className="flex-1"><h4 className="font-medium text-gray-100">{item.productName || item.name || item.product_name}</h4><p className="text-sm text-gray-400">SL: {item.quantity}</p><p className="text-amber-500">{(item.price * item.quantity).toLocaleString('vi-VN')}₫</p></div></div>)}</div>
                <div className="border-t border-gray-800 pt-4"><div className="flex justify-between text-lg font-bold"><span className="text-gray-100">Tổng:</span><span className="text-amber-500">{(selectedOrder.total_amount || selectedOrder.total || 0).toLocaleString('vi-VN')}₫</span></div></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default OrderHistoryPage;
