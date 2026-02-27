import { useState, useEffect, useRef } from 'react';
import { 
  Eye, Package, Truck, CheckCircle, XCircle, Clock, RefreshCw, Search,
  Printer, Download, Filter, Calendar, Phone, MapPin, User, CreditCard,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import orderService from '../../services/orderService';
import toast from 'react-hot-toast';

const StaffOrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [filters, setFilters] = useState({ 
    status: '', 
    paymentStatus: '', 
    search: '',
    dateFrom: '',
    dateTo: '',
    page: 1 
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [trackingData, setTrackingData] = useState({ trackingNumber: '', shippingCarrier: '' });
  const [expandedStats, setExpandedStats] = useState(true);
  const invoiceRef = useRef(null);

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
      await orderService.updateOrderStatus(
        orderId, 
        status,
        status === 'shipped' ? trackingData.trackingNumber : null,
        status === 'shipped' ? trackingData.shippingCarrier : null
      );
      toast.success('Cập nhật trạng thái thành công');
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status } : null);
      }
      setTrackingData({ trackingNumber: '', shippingCarrier: '' });
    } catch (error) {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    try {
      await orderService.updateOrderStatus(orderId, 'cancelled');
      toast.success('Đã hủy đơn hàng');
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      toast.error('Không thể hủy đơn hàng');
    }
  };

  const printInvoice = () => {
    const printContent = invoiceRef.current;
    const WinPrint = window.open('', '', 'width=800,height=600');
    WinPrint.document.write(`
      <html>
        <head>
          <title>Hóa đơn #${selectedOrder?.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #f59e0b; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f5f5f5; }
            .total { font-size: 18px; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    WinPrint.document.close();
    WinPrint.focus();
    WinPrint.print();
    WinPrint.close();
  };

  const exportOrdersCSV = () => {
    const headers = ['Mã đơn', 'Khách hàng', 'SĐT', 'Tổng tiền', 'Trạng thái', 'Thanh toán', 'Ngày tạo'];
    const rows = orders.map(o => [
      o.orderNumber,
      o.user?.name || 'N/A',
      o.user?.phone || 'N/A',
      o.total,
      o.status,
      o.paymentStatus,
      new Date(o.createdAt).toLocaleDateString('vi-VN')
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Xuất file thành công');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock size={14} />, label: 'Chờ xử lý' },
      confirmed: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <CheckCircle size={14} />, label: 'Đã xác nhận' },
      processing: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: <Package size={14} />, label: 'Đang xử lý' },
      shipped: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: <Truck size={14} />, label: 'Đang giao' },
      delivered: { color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle size={14} />, label: 'Đã giao' },
      cancelled: { color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle size={14} />, label: 'Đã hủy' },
      refunded: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <RefreshCw size={14} />, label: 'Hoàn tiền' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const getPaymentBadge = (status, method) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    const labels = { pending: 'Chưa TT', paid: 'Đã TT', failed: 'Thất bại', refunded: 'Hoàn tiền' };
    const methodLabels = { cod: 'COD', vnpay: 'VNPAY', momo: 'MoMo', bank: 'Chuyển khoản' };
    return (
      <div className="flex flex-col gap-1">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
          {labels[status] || status}
        </span>
        {method && <span className="text-xs text-gray-500">{methodLabels[method] || method}</span>}
      </div>
    );
  };

  const getNextStatus = (currentStatus) => {
    const flow = { pending: 'confirmed', confirmed: 'processing', processing: 'shipped', shipped: 'delivered' };
    return flow[currentStatus] || null;
  };

  const getNextStatusLabel = (nextStatus) => {
    const labels = { confirmed: 'Xác nhận', processing: 'Xử lý', shipped: 'Giao hàng', delivered: 'Hoàn thành' };
    return labels[nextStatus] || nextStatus;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => ['confirmed', 'processing'].includes(o.status)).length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalRevenue: orders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + parseFloat(o.total || 0), 0),
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản Lý Đơn Hàng</h1>
          <p className="text-gray-600 mt-1">Xử lý và cập nhật trạng thái đơn hàng</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportOrdersCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download size={18} /> Xuất CSV
          </button>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            <RefreshCw size={18} /> Làm mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg shadow mb-6">
        <button
          onClick={() => setExpandedStats(!expandedStats)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
        >
          <span className="font-semibold text-gray-700">Thống kê đơn hàng</span>
          {expandedStats ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {expandedStats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 border-t">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-gray-500">Chờ xử lý</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{stats.processing}</p>
              <p className="text-sm text-gray-500">Đang xử lý</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.shipped}</p>
              <p className="text-sm text-gray-500">Đang giao</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              <p className="text-sm text-gray-500">Đã giao</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              <p className="text-sm text-gray-500">Đã hủy</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">{(stats.totalRevenue / 1000000).toFixed(1)}M</p>
              <p className="text-sm text-gray-500">Doanh thu</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Tìm theo mã đơn, tên khách hàng..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
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
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">Tất cả thanh toán</option>
            <option value="pending">Chưa thanh toán</option>
            <option value="paid">Đã thanh toán</option>
          </select>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, page: 1 })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="Từ ngày"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, page: 1 })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="Đến ngày"
          />
          <button
            onClick={() => setFilters({ status: '', paymentStatus: '', search: '', dateFrom: '', dateTo: '', page: 1 })}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Không có đơn hàng nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mã đơn</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Khách hàng</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sản phẩm</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tổng tiền</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Thanh toán</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ngày tạo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-green-600">{order.orderNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800">{order.user?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{order.user?.phone || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{order.items?.length || 0} sản phẩm</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800">
                        {parseFloat(order.total).toLocaleString('vi-VN')}₫
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                    <td className="px-4 py-3">{getPaymentBadge(order.paymentStatus, order.paymentMethod)}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{formatDate(order.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setSelectedOrder(order); setShowInvoice(false); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => { setSelectedOrder(order); setShowInvoice(true); }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="In hóa đơn"
                        >
                          <Printer size={18} />
                        </button>
                        {getNextStatus(order.status) && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, getNextStatus(order.status))}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200"
                          >
                            {getNextStatusLabel(getNextStatus(order.status))}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Trước
          </button>
          <span className="px-4 py-2 text-gray-600">
            Trang {filters.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={filters.page === pagination.totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Sau
          </button>
        </div>
      )}

      {/* Order Detail / Invoice Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold">
                  {showInvoice ? 'Hóa đơn' : 'Chi tiết đơn hàng'} #{selectedOrder.orderNumber}
                </h3>
                <div className="flex border rounded-lg">
                  <button
                    onClick={() => setShowInvoice(false)}
                    className={`px-3 py-1 text-sm ${!showInvoice ? 'bg-green-500 text-white' : 'text-gray-600'} rounded-l-lg`}
                  >
                    Chi tiết
                  </button>
                  <button
                    onClick={() => setShowInvoice(true)}
                    className={`px-3 py-1 text-sm ${showInvoice ? 'bg-green-500 text-white' : 'text-gray-600'} rounded-r-lg`}
                  >
                    Hóa đơn
                  </button>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {showInvoice ? (
              /* Invoice View */
              <div className="p-6">
                <div ref={invoiceRef}>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-amber-500">E-COMMERCE</h2>
                    <p className="text-gray-500">Hóa đơn bán hàng</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div>
                      <p><strong>Mã đơn:</strong> {selectedOrder.orderNumber}</p>
                      <p><strong>Ngày:</strong> {formatDate(selectedOrder.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p><strong>Khách hàng:</strong> {selectedOrder.user?.name}</p>
                      <p><strong>SĐT:</strong> {selectedOrder.user?.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm"><strong>Địa chỉ giao hàng:</strong></p>
                    <p className="text-sm text-gray-600">
                      {typeof selectedOrder.shippingAddress === 'string'
                        ? selectedOrder.shippingAddress
                        : `${selectedOrder.shippingAddress?.name || ''}, ${selectedOrder.shippingAddress?.phone || ''}, ${selectedOrder.shippingAddress?.address || ''}`}
                    </p>
                  </div>
                  <table className="w-full mb-6 text-sm">
                    <thead>
                      <tr className="border-b-2">
                        <th className="py-2 text-left">Sản phẩm</th>
                        <th className="py-2 text-center">SL</th>
                        <th className="py-2 text-right">Đơn giá</th>
                        <th className="py-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2">{item.productName}</td>
                          <td className="py-2 text-center">{item.quantity}</td>
                          <td className="py-2 text-right">{parseFloat(item.price).toLocaleString('vi-VN')}₫</td>
                          <td className="py-2 text-right">{parseFloat(item.total).toLocaleString('vi-VN')}₫</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Tạm tính:</span>
                      <span>{parseFloat(selectedOrder.subtotal).toLocaleString('vi-VN')}₫</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phí vận chuyển:</span>
                      <span>{parseFloat(selectedOrder.shippingFee || 0).toLocaleString('vi-VN')}₫</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Tổng cộng:</span>
                      <span className="text-green-600">{parseFloat(selectedOrder.total).toLocaleString('vi-VN')}₫</span>
                    </div>
                  </div>
                  <div className="mt-8 text-center text-xs text-gray-500">
                    <p>Cảm ơn quý khách đã mua hàng!</p>
                    <p>Hotline: 1900-xxxx | Email: support@ecommerce.vn</p>
                  </div>
                </div>
                <button
                  onClick={printInvoice}
                  className="w-full mt-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <Printer size={20} /> In hóa đơn
                </button>
              </div>
            ) : (
              /* Detail View */
              <div className="p-6 space-y-6">
                {/* Status & Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Khách hàng</p>
                        <p className="font-medium">{selectedOrder.user?.name}</p>
                        <p className="text-sm text-gray-500">{selectedOrder.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Số điện thoại</p>
                        <p className="font-medium">{selectedOrder.user?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Địa chỉ giao hàng</p>
                        <p className="font-medium">
                          {typeof selectedOrder.shippingAddress === 'string'
                            ? selectedOrder.shippingAddress
                            : selectedOrder.shippingAddress?.address || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CreditCard className="text-gray-400" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Thanh toán</p>
                        <p className="font-medium">
                          {selectedOrder.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng' : selectedOrder.paymentMethod?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Sản phẩm ({selectedOrder.items?.length || 0})</h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={item.productImage || 'https://via.placeholder.com/60'}
                          alt=""
                          className="w-14 h-14 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-500">
                            {item.quantity} x {parseFloat(item.price).toLocaleString('vi-VN')}₫
                          </p>
                        </div>
                        <p className="font-semibold">{parseFloat(item.total).toLocaleString('vi-VN')}₫</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping info for processing orders */}
                {selectedOrder.status === 'processing' && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3">Thông tin vận chuyển</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Mã vận đơn"
                        value={trackingData.trackingNumber}
                        onChange={(e) => setTrackingData({ ...trackingData, trackingNumber: e.target.value })}
                        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Đơn vị vận chuyển (GHN, GHTK...)"
                        value={trackingData.shippingCarrier}
                        onChange={(e) => setTrackingData({ ...trackingData, shippingCarrier: e.target.value })}
                        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Tracking info */}
                {selectedOrder.trackingNumber && (
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-indigo-800 mb-2">Thông tin vận chuyển</h4>
                    <p className="text-sm">
                      <strong>Mã vận đơn:</strong> {selectedOrder.trackingNumber}
                    </p>
                    {selectedOrder.shippingCarrier && (
                      <p className="text-sm">
                        <strong>Đơn vị:</strong> {selectedOrder.shippingCarrier}
                      </p>
                    )}
                  </div>
                )}

                {/* Total */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tạm tính</span>
                    <span>{parseFloat(selectedOrder.subtotal).toLocaleString('vi-VN')}₫</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phí vận chuyển</span>
                    <span>{parseFloat(selectedOrder.shippingFee || 0).toLocaleString('vi-VN')}₫</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Tổng cộng</span>
                    <span className="text-green-600">{parseFloat(selectedOrder.total).toLocaleString('vi-VN')}₫</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {getNextStatus(selectedOrder.status) && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, getNextStatus(selectedOrder.status))}
                      className="flex-1 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
                    >
                      {getNextStatusLabel(getNextStatus(selectedOrder.status))} đơn hàng
                    </button>
                  )}
                  {['pending', 'confirmed'].includes(selectedOrder.status) && (
                    <button
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      className="px-6 py-3 border border-red-500 text-red-500 rounded-lg font-semibold hover:bg-red-50"
                    >
                      Hủy đơn
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffOrderManagement;
