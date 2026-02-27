import { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { 
  BarChart3, PieChart, TrendingUp, TrendingDown, Download,
  Calendar, Filter, Package, Users, ShoppingCart, DollarSign,
  ArrowUpRight, ArrowDownRight, ChevronDown, Printer
} from 'lucide-react';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import orderService from '../../services/orderService';
import userService from '../../services/userService';

const AdminReports = () => {
  const [reportType, setReportType] = useState('revenue');
  const [timeRange, setTimeRange] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);

  const { data: ordersData } = useQuery('report-orders', () =>
    orderService.getAllOrders({ limit: 10000 })
  );

  const { data: productsData } = useQuery('report-products', () =>
    productService.getProducts({ limit: 1000 })
  );

  const { data: categoriesData } = useQuery('report-categories', () =>
    categoryService.getCategories()
  );

  const { data: usersData } = useQuery('report-users', () =>
    userService.getUsers({ limit: 1000 })
  );

  const orders = ordersData?.data || [];
  const products = productsData?.data || [];
  const categories = categoriesData?.data || [];
  const users = usersData?.data || [];

  // Filter orders by time range
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const date = new Date(order.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const quarter = Math.floor(date.getMonth() / 3) + 1;

      if (timeRange === 'month') {
        return year === selectedYear && month === selectedMonth;
      } else if (timeRange === 'quarter') {
        return year === selectedYear && quarter === selectedQuarter;
      } else {
        return year === selectedYear;
      }
    });
  }, [orders, timeRange, selectedYear, selectedMonth, selectedQuarter]);

  const paidOrders = filteredOrders.filter(o => o.paymentStatus === 'paid');

  // Revenue statistics
  const revenueStats = useMemo(() => {
    const totalRevenue = paidOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    const totalOrders = paidOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Compare with previous period
    let prevOrders = [];
    if (timeRange === 'month') {
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
      prevOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getFullYear() === prevYear && d.getMonth() + 1 === prevMonth && o.paymentStatus === 'paid';
      });
    } else if (timeRange === 'quarter') {
      const prevQ = selectedQuarter === 1 ? 4 : selectedQuarter - 1;
      const prevY = selectedQuarter === 1 ? selectedYear - 1 : selectedYear;
      prevOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getFullYear() === prevY && Math.floor(d.getMonth() / 3) + 1 === prevQ && o.paymentStatus === 'paid';
      });
    } else {
      prevOrders = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getFullYear() === selectedYear - 1 && o.paymentStatus === 'paid';
      });
    }

    const prevRevenue = prevOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    const growth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;

    return { totalRevenue, totalOrders, avgOrderValue, growth, prevRevenue };
  }, [paidOrders, orders, timeRange, selectedYear, selectedMonth, selectedQuarter]);

  // Revenue by category
  const categoryRevenue = useMemo(() => {
    const map = new Map();
    
    paidOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const cat = categories.find(c => c.id === product?.categoryId) || { id: 0, name: 'Khác' };
        const current = map.get(cat.id) || { id: cat.id, name: cat.name, revenue: 0, quantity: 0, orders: 0 };
        current.revenue += parseFloat(item.total || 0);
        current.quantity += item.quantity || 1;
        current.orders += 1;
        map.set(cat.id, current);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [paidOrders, products, categories]);

  // Revenue by product
  const productRevenue = useMemo(() => {
    const map = new Map();

    paidOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const current = map.get(item.productId) || {
          id: item.productId,
          name: item.productName,
          revenue: 0,
          quantity: 0,
          orders: 0,
        };
        current.revenue += parseFloat(item.total || 0);
        current.quantity += item.quantity || 1;
        current.orders += 1;
        map.set(item.productId, current);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [paidOrders]);

  // Daily revenue for chart
  const dailyRevenue = useMemo(() => {
    const map = new Map();

    paidOrders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      const current = map.get(date) || { date, revenue: 0, orders: 0 };
      current.revenue += parseFloat(order.total || 0);
      current.orders += 1;
      map.set(date, current);
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [paidOrders]);

  // Order status breakdown
  const orderStatus = useMemo(() => {
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    return statuses.map(status => ({
      status,
      count: filteredOrders.filter(o => o.status === status).length,
      revenue: filteredOrders.filter(o => o.status === status).reduce((sum, o) => sum + parseFloat(o.total || 0), 0),
    }));
  }, [filteredOrders]);

  const formatPrice = (value) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString('vi-VN');
  };

  const exportCSV = (data, filename) => {
    let csv = '';
    if (data.length > 0) {
      csv = Object.keys(data[0]).join(',') + '\n';
      csv += data.map(row => Object.values(row).join(',')).join('\n');
    }
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${selectedYear}${timeRange === 'month' ? '_T' + selectedMonth : timeRange === 'quarter' ? '_Q' + selectedQuarter : ''}.csv`;
    a.click();
  };

  const printReport = () => {
    window.print();
  };

  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Chờ xử lý',
      confirmed: 'Đã xác nhận',
      processing: 'Đang xử lý',
      shipped: 'Đang giao',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const maxDailyRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1);
  const totalCategoryRevenue = categoryRevenue.reduce((sum, c) => sum + c.revenue, 0);

  return (
    <div className="p-6 space-y-6 print:p-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Báo Cáo & Thống Kê</h1>
          <p className="text-gray-500">Phân tích chi tiết doanh thu và hoạt động kinh doanh</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={printReport}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Printer size={18} /> In báo cáo
          </button>
          <button
            onClick={() => exportCSV(reportType === 'category' ? categoryRevenue : productRevenue, reportType)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            <Download size={18} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 print:hidden">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={20} />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="month">Theo tháng</option>
              <option value="quarter">Theo quý</option>
              <option value="year">Theo năm</option>
            </select>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>

          {timeRange === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {monthNames.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
          )}

          {timeRange === 'quarter' && (
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Quý 1 (T1-T3)</option>
              <option value={2}>Quý 2 (T4-T6)</option>
              <option value={3}>Quý 3 (T7-T9)</option>
              <option value={4}>Quý 4 (T10-T12)</option>
            </select>
          )}

          <div className="flex-1" />

          <div className="flex border rounded-lg overflow-hidden">
            {['revenue', 'category', 'product'].map((type) => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`px-4 py-2 text-sm font-medium ${
                  reportType === type ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {type === 'revenue' ? 'Doanh thu' : type === 'category' ? 'Danh mục' : 'Sản phẩm'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">BÁO CÁO DOANH THU</h1>
        <p className="text-gray-600">
          {timeRange === 'month' ? `Tháng ${selectedMonth}/${selectedYear}` :
           timeRange === 'quarter' ? `Quý ${selectedQuarter}/${selectedYear}` : `Năm ${selectedYear}`}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <DollarSign size={24} />
            {revenueStats.growth !== 0 && (
              <span className={`flex items-center text-sm ${revenueStats.growth > 0 ? 'text-blue-100' : 'text-red-200'}`}>
                {revenueStats.growth > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {Math.abs(revenueStats.growth).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-3xl font-bold">{formatPrice(revenueStats.totalRevenue)}₫</p>
          <p className="text-blue-100 text-sm mt-1">Tổng doanh thu</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="text-green-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{revenueStats.totalOrders}</p>
          <p className="text-gray-500 text-sm mt-1">Đơn hàng thành công</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-purple-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{formatPrice(revenueStats.avgOrderValue)}₫</p>
          <p className="text-gray-500 text-sm mt-1">Giá trị TB/đơn</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="text-orange-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {productRevenue.reduce((sum, p) => sum + p.quantity, 0)}
          </p>
          <p className="text-gray-500 text-sm mt-1">Sản phẩm đã bán</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart / Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          {reportType === 'revenue' && (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Biểu đồ doanh thu theo ngày</h3>
              {dailyRevenue.length > 0 ? (
                <div className="h-64 flex items-end gap-1 overflow-x-auto pb-4">
                  {dailyRevenue.map((day, idx) => (
                    <div key={idx} className="flex flex-col items-center min-w-[30px] group">
                      <div className="relative">
                        <div
                          className="w-6 bg-blue-500 rounded-t hover:bg-blue-600 cursor-pointer transition-colors"
                          style={{ height: `${Math.max((day.revenue / maxDailyRevenue) * 180, 4)}px` }}
                        />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {formatPrice(day.revenue)}₫<br/>{day.orders} đơn
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 -rotate-45 origin-top-left">
                        {day.date.split('-').slice(1).join('/')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Không có dữ liệu trong kỳ này
                </div>
              )}
            </>
          )}

          {reportType === 'category' && (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Doanh thu theo danh mục</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Danh mục</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Doanh thu</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">SL bán</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Tỷ lệ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {categoryRevenue.map((cat, idx) => (
                      <tr key={cat.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          {formatPrice(cat.revenue)}₫
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{cat.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${totalCategoryRevenue > 0 ? (cat.revenue / totalCategoryRevenue) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-500">
                              {totalCategoryRevenue > 0 ? ((cat.revenue / totalCategoryRevenue) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan="2" className="px-4 py-3">Tổng cộng</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatPrice(totalCategoryRevenue)}₫</td>
                      <td className="px-4 py-3 text-right">{categoryRevenue.reduce((sum, c) => sum + c.quantity, 0)}</td>
                      <td className="px-4 py-3 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {reportType === 'product' && (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Doanh thu theo sản phẩm</h3>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sản phẩm</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Doanh thu</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">SL bán</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Đơn hàng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {productRevenue.slice(0, 20).map((product, idx) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                            idx === 1 ? 'bg-gray-100 text-gray-700' :
                            idx === 2 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800 line-clamp-1">{product.name}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          {formatPrice(product.revenue)}₫
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{product.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{product.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {productRevenue.length > 20 && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  Hiển thị 20/{productRevenue.length} sản phẩm. Xuất CSV để xem tất cả.
                </p>
              )}
            </>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Order Status */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Trạng thái đơn hàng</h3>
            <div className="space-y-3">
              {orderStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-800">{item.count}</span>
                    <span className="text-sm text-gray-400 ml-1">đơn</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Pie Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Phân bổ doanh thu</h3>
            {categoryRevenue.length > 0 ? (
              <div className="space-y-3">
                {categoryRevenue.slice(0, 5).map((cat, idx) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
                  const percent = totalCategoryRevenue > 0 ? (cat.revenue / totalCategoryRevenue * 100).toFixed(1) : 0;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colors[idx]}`} />
                          <span className="text-sm text-gray-700">{cat.name}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-800">{percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[idx]} rounded-full transition-all`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Không có dữ liệu</p>
            )}
          </div>

          {/* Quick Info */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 text-white">
            <h3 className="font-semibold mb-4">So với kỳ trước</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Doanh thu trước</span>
                <span className="font-semibold">{formatPrice(revenueStats.prevRevenue)}₫</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Tăng trưởng</span>
                <span className={`flex items-center font-semibold ${revenueStats.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {revenueStats.growth >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  {Math.abs(revenueStats.growth).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Chênh lệch</span>
                <span className={`font-semibold ${revenueStats.totalRevenue >= revenueStats.prevRevenue ? 'text-green-400' : 'text-red-400'}`}>
                  {revenueStats.totalRevenue >= revenueStats.prevRevenue ? '+' : ''}
                  {formatPrice(revenueStats.totalRevenue - revenueStats.prevRevenue)}₫
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
