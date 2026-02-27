import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Users, Package, FolderOpen, ShoppingCart, Clock, TrendingUp,
  ArrowUpRight, ArrowDownRight, DollarSign, BarChart3, PieChart,
  ArrowRight
} from 'lucide-react';
import productService from '../../services/productService';
import userService from '../../services/userService';
import categoryService from '../../services/categoryService';
import orderService from '../../services/orderService';

const AdminDashboard = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: productsData } = useQuery('admin-products', () =>
    productService.getProducts({ limit: 1000 })
  );

  const { data: usersData } = useQuery('admin-users', () =>
    userService.getUsers({ limit: 1000 })
  );

  const { data: categoriesData } = useQuery('admin-categories', () =>
    categoryService.getCategories()
  );

  const { data: ordersData } = useQuery('admin-orders', () =>
    orderService.getAllOrders({ limit: 1000 })
  );

  const orders = ordersData?.data || [];
  const products = productsData?.data || [];
  const users = usersData?.data || [];
  const categories = categoriesData?.data || [];

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;

    // This month's revenue
    const now = new Date();
    const thisMonth = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate.getMonth() === now.getMonth() && 
             orderDate.getFullYear() === now.getFullYear() &&
             o.paymentStatus === 'paid';
    }).reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    // Last month's revenue
    const lastMonth = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return orderDate.getMonth() === lastMonthDate.getMonth() && 
             orderDate.getFullYear() === lastMonthDate.getFullYear() &&
             o.paymentStatus === 'paid';
    }).reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    const revenueGrowth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : 0;

    return {
      totalUsers: users.length,
      totalProducts: products.length,
      totalCategories: categories.length,
      totalOrders: orders.length,
      pendingOrders,
      completedOrders,
      totalRevenue,
      thisMonthRevenue: thisMonth,
      revenueGrowth,
    };
  }, [orders, products, users, categories]);

  // Revenue by time period
  const revenueData = useMemo(() => {
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
    
    if (timeRange === 'month') {
      // Revenue by month for selected year
      const monthlyData = Array(12).fill(0).map((_, i) => ({
        label: `T${i + 1}`,
        value: 0,
        orders: 0,
      }));

      paidOrders.forEach(order => {
        const date = new Date(order.createdAt);
        if (date.getFullYear() === selectedYear) {
          const month = date.getMonth();
          monthlyData[month].value += parseFloat(order.total || 0);
          monthlyData[month].orders += 1;
        }
      });

      return monthlyData;
    } else if (timeRange === 'quarter') {
      const quarterData = [
        { label: 'Q1', value: 0, orders: 0 },
        { label: 'Q2', value: 0, orders: 0 },
        { label: 'Q3', value: 0, orders: 0 },
        { label: 'Q4', value: 0, orders: 0 },
      ];

      paidOrders.forEach(order => {
        const date = new Date(order.createdAt);
        if (date.getFullYear() === selectedYear) {
          const quarter = Math.floor(date.getMonth() / 3);
          quarterData[quarter].value += parseFloat(order.total || 0);
          quarterData[quarter].orders += 1;
        }
      });

      return quarterData;
    } else {
      // Revenue by year (last 5 years)
      const currentYear = new Date().getFullYear();
      const yearData = [];
      for (let y = currentYear - 4; y <= currentYear; y++) {
        const yearOrders = paidOrders.filter(o => new Date(o.createdAt).getFullYear() === y);
        yearData.push({
          label: y.toString(),
          value: yearOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0),
          orders: yearOrders.length,
        });
      }
      return yearData;
    }
  }, [orders, timeRange, selectedYear]);

  // Revenue by category
  const categoryRevenue = useMemo(() => {
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
    const categoryMap = new Map();

    paidOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const category = product?.category || { id: 0, name: 'Khác' };
        const current = categoryMap.get(category.id) || { name: category.name, value: 0, count: 0 };
        current.value += parseFloat(item.total || 0);
        current.count += item.quantity || 1;
        categoryMap.set(category.id, current);
      });
    });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [orders, products]);

  // Top selling products
  const topProducts = useMemo(() => {
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
    const productMap = new Map();

    paidOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const current = productMap.get(item.productId) || {
          id: item.productId,
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };
        current.quantity += item.quantity || 1;
        current.revenue += parseFloat(item.total || 0);
        productMap.set(item.productId, current);
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  const formatPrice = (value) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString('vi-VN');
  };

  const maxRevenue = Math.max(...revenueData.map(d => d.value), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Bảng điều khiển</h1>
          <p className="text-gray-500">Tổng quan kinh doanh</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/reports"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm"
          >
            <BarChart3 size={18} /> Xem báo cáo chi tiết
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Link to="/admin/users" className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="text-blue-600" size={20} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
          <p className="text-sm text-gray-500">Người dùng</p>
        </Link>

        <Link to="/admin/products" className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="text-green-600" size={20} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.totalProducts}</p>
          <p className="text-sm text-gray-500">Sản phẩm</p>
        </Link>

        <Link to="/admin/categories" className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="text-purple-600" size={20} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.totalCategories}</p>
          <p className="text-sm text-gray-500">Danh mục</p>
        </Link>

        <Link to="/admin/orders" className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="text-orange-600" size={20} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.totalOrders}</p>
          <p className="text-sm text-gray-500">Đơn hàng</p>
        </Link>

        <Link to="/admin/orders?status=pending" className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="text-yellow-600" size={20} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.pendingOrders}</p>
          <p className="text-sm text-gray-500">Chờ xử lý</p>
        </Link>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="text-white" size={20} />
            </div>
            {parseFloat(stats.revenueGrowth) !== 0 && (
              <span className={`flex items-center text-sm ${parseFloat(stats.revenueGrowth) > 0 ? 'text-emerald-100' : 'text-red-200'}`}>
                {parseFloat(stats.revenueGrowth) > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {Math.abs(stats.revenueGrowth)}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}₫</p>
          <p className="text-sm text-emerald-100">Tổng doanh thu</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Biểu đồ doanh thu</h3>
              <p className="text-sm text-gray-500">Doanh thu theo {timeRange === 'month' ? 'tháng' : timeRange === 'quarter' ? 'quý' : 'năm'}</p>
            </div>
            <div className="flex items-center gap-2">
              {timeRange !== 'year' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              )}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="month">Theo tháng</option>
                <option value="quarter">Theo quý</option>
                <option value="year">Theo năm</option>
              </select>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-2">
            {revenueData.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full relative group">
                  <div
                    className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 cursor-pointer"
                    style={{ height: `${Math.max((item.value / maxRevenue) * 200, 4)}px` }}
                  />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {formatPrice(item.value)}₫
                    <br />
                    {item.orders} đơn
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-2">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {formatPrice(revenueData.reduce((sum, d) => sum + d.value, 0))}₫
              </p>
              <p className="text-sm text-gray-500">Tổng doanh thu</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {revenueData.reduce((sum, d) => sum + d.orders, 0)}
              </p>
              <p className="text-sm text-gray-500">Tổng đơn hàng</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatPrice(revenueData.reduce((sum, d) => sum + d.value, 0) / Math.max(revenueData.reduce((sum, d) => sum + d.orders, 0), 1))}₫
              </p>
              <p className="text-sm text-gray-500">Giá trị TB/đơn</p>
            </div>
          </div>
        </div>

        {/* Category Revenue */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Doanh thu theo danh mục</h3>
              <p className="text-sm text-gray-500">Top 5 danh mục</p>
            </div>
            <PieChart className="text-gray-400" size={20} />
          </div>

          <div className="space-y-4">
            {categoryRevenue.length > 0 ? categoryRevenue.map((cat, idx) => {
              const maxCatRevenue = categoryRevenue[0]?.value || 1;
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                    <span className="text-sm text-gray-500">{formatPrice(cat.value)}₫</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[idx]} rounded-full transition-all`}
                      style={{ width: `${(cat.value / maxCatRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              );
            }) : (
              <p className="text-gray-500 text-center py-8">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Sản phẩm bán chạy</h3>
            <Link to="/admin/reports" className="text-blue-500 text-sm hover:underline inline-flex items-center gap-1">Xem tất cả <ArrowRight size={14} /></Link>
          </div>
          <div className="space-y-3">
            {topProducts.length > 0 ? topProducts.map((product, idx) => (
              <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-gray-300'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.quantity} đã bán</p>
                </div>
                <p className="font-semibold text-green-600">{formatPrice(product.revenue)}₫</p>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8">Chưa có dữ liệu</p>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Đơn hàng gần đây</h3>
            <Link to="/admin/orders" className="text-blue-500 text-sm hover:underline inline-flex items-center gap-1">Xem tất cả <ArrowRight size={14} /></Link>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-blue-600">{order.orderNumber}</p>
                  <p className="text-sm text-gray-500">{order.user?.name || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{parseFloat(order.total).toLocaleString('vi-VN')}₫</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-gray-500 text-center py-8">Chưa có đơn hàng</p>
            )}
          </div>
        </div>
      </div>

      {/* Thao tác nhanh */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Link to="/admin/users" className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <Users className="text-blue-500" size={24} />
            <span className="text-sm font-medium text-gray-700">Quản lý người dùng</span>
          </Link>
          <Link to="/admin/products" className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors">
            <Package className="text-green-500" size={24} />
            <span className="text-sm font-medium text-gray-700">Sản phẩm</span>
          </Link>
          <Link to="/admin/orders" className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-colors">
            <ShoppingCart className="text-orange-500" size={24} />
            <span className="text-sm font-medium text-gray-700">Đơn hàng</span>
          </Link>
          <Link to="/admin/staff/create" className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors">
            <Users className="text-purple-500" size={24} />
            <span className="text-sm font-medium text-gray-700">Tạo tài khoản</span>
          </Link>
          <Link to="/admin/reports" className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl hover:border-pink-500 hover:bg-pink-50 transition-colors">
            <BarChart3 className="text-pink-500" size={24} />
            <span className="text-sm font-medium text-gray-700">Báo cáo</span>
          </Link>
          <Link to="/admin/settings" className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-xl hover:border-gray-500 hover:bg-gray-50 transition-colors">
            <TrendingUp className="text-gray-500" size={24} />
            <span className="text-sm font-medium text-gray-700">Cài đặt</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
