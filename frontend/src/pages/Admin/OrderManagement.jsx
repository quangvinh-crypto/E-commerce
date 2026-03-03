import { useState, useEffect } from 'react';
import { Eye, Package, Truck, CheckCircle, XCircle, Clock, RefreshCw, X } from 'lucide-react';
import orderService from '../../services/orderService';
import toast from 'react-hot-toast';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({ status: '', paymentStatus: '', page: 1 });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { ...filters, limit: 10 };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await orderService.getAllOrders(params);
      setOrders(res.data || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await orderService.updateOrderStatus(orderId, status);
      toast.success('Cập nhật trạng thái thành công');
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={14} />, label: 'Chờ xử lý' },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle size={14} />, label: 'Đã xác nhận' },
      processing: { color: 'bg-purple-100 text-purple-800', icon: <Package size={14} />, label: 'Đang xử lý' },
      shipped: { color: 'bg-indigo-100 text-indigo-800', icon: <Truck size={14} />, label: 'Đang giao' },
      delivered: { color: 'bg-green-100 text-green-800', icon: <CheckCircle size={14} />, label: 'Đã giao' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: <XCircle size={14} />, label: 'Đã hủy' },
      refunded: { color: 'bg-gray-100 text-gray-800', icon: <RefreshCw size={14} />, label: 'Hoàn tiền' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const getPaymentBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    const labels = { pending: 'Chưa TT', paid: 'Đã TT', failed: 'Thất bại', refunded: 'Hoàn tiền' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản Lý Đơn Hàng</h1>
        <p className="text-gray-600 mt-2">Xem và quản lý tất cả đơn hàng</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="processing">Đang xử lý</option>
            <option value="shipped">Đang giao</option>
            <option value="delivered">Đã giao</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value, page: 1 })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả TT thanh toán</option>
            <option value="pending">Chưa thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="failed">Thất bại</option>
          </select>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2 shadow-sm"
          >
            <RefreshCw size={18} /> Làm mới
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-500">Không có đơn hàng nào</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Mã đơn</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Khách hàng</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Tổng tiền</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Thanh toán</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Ngày tạo</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-blue-600">{order.orderNumber}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{order.user?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{order.user?.email}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {parseFloat(order.total).toLocaleString('vi-VN')}₫
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4">{getPaymentBadge(order.paymentStatus)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page === 1}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50"
          >
            Trước
          </button>
          <span className="px-4 py-2">
            Trang {filters.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={filters.page === pagination.totalPages}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50"
          >
            Sau
          </button>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Chi tiết đơn hàng #{selectedOrder.orderNumber}</h3>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100" aria-label="Đóng">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Khách hàng</label>
                  <p className="font-medium">{selectedOrder.user?.name}</p>
                  <p className="text-sm text-gray-500">{selectedOrder.user?.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Địa chỉ giao hàng</label>
                  <p className="font-medium">
                    {typeof selectedOrder.shippingAddress === 'string'
                      ? selectedOrder.shippingAddress
                      : selectedOrder.shippingAddress?.address || 'N/A'}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Sản phẩm</label>
                <div className="mt-2 space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <img src={item.productImage || 'https://via.placeholder.com/50'} alt="" className="w-12 h-12 object-cover rounded" />
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-500">x{item.quantity}</p>
                      </div>
                      <p className="font-semibold">{parseFloat(item.total).toLocaleString('vi-VN')}₫</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Tạm tính</span>
                  <span>{parseFloat(selectedOrder.subtotal).toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Phí vận chuyển</span>
                  <span>{parseFloat(selectedOrder.shippingFee).toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Thuế</span>
                  <span>{parseFloat(selectedOrder.tax).toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Tổng cộng</span>
                  <span className="text-blue-600">{parseFloat(selectedOrder.total).toLocaleString('vi-VN')}₫</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Cập nhật trạng thái</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedOrder.id, status)}
                      disabled={selectedOrder.status === status}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                        selectedOrder.status === status
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {status === 'confirmed' && 'Xác nhận'}
                      {status === 'processing' && 'Xử lý'}
                      {status === 'shipped' && 'Giao hàng'}
                      {status === 'delivered' && 'Đã giao'}
                      {status === 'cancelled' && 'Hủy'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
