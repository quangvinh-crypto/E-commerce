import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import orderService from '../../services/orderService';

const StaffDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    pendingOrders: 0,
    processingOrders: 0,
  });

  // Fetch products
  const { data: productsData } = useQuery('staff-products', () =>
    productService.getProducts({ limit: 1000 })
  );

  // Fetch categories
  const { data: categoriesData } = useQuery('staff-categories', () =>
    categoryService.getCategories()
  );

  // Fetch orders
  const { data: ordersData } = useQuery('staff-orders', () =>
    orderService.getAllOrders({ limit: 100 })
  );

  useEffect(() => {
    const products = productsData?.data || [];
    const orders = ordersData?.data || [];
    
    setStats({
      totalProducts: products.length,
      totalCategories: categoriesData?.data?.length || 0,
      activeProducts: products.filter((p) => p.isActive).length,
      lowStockProducts: products.filter((p) => p.quantity < 10).length,
      pendingOrders: orders.filter((o) => o.status === 'pending').length,
      processingOrders: orders.filter((o) => ['confirmed', 'processing', 'shipped'].includes(o.status)).length,
    });
  }, [productsData, categoriesData, ordersData]);

  const StatCard = ({ title, value, icon, color, link }) => (
    <Link to={link} className="block">
      <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${color} hover:shadow-lg transition`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <div className={`text-4xl ${color.replace('border-', 'text-')}`}>
            {icon}
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Staff Dashboard</h1>
        <p className="text-gray-600 mt-2">Quản lý sản phẩm và đơn hàng</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Tổng Products"
          value={stats.totalProducts}
          icon="📦"
          color="border-blue-500"
          link="/staff/products"
        />
        <StatCard
          title="Tổng Categories"
          value={stats.totalCategories}
          icon="📁"
          color="border-green-500"
          link="/staff/categories"
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStockProducts}
          icon="⚠️"
          color="border-orange-500"
          link="/staff/products"
        />
        <StatCard
          title="Đơn Chờ Xử Lý"
          value={stats.pendingOrders}
          icon="⏳"
          color="border-yellow-500"
          link="/staff/orders"
        />
        <StatCard
          title="Đơn Đang Xử Lý"
          value={stats.processingOrders}
          icon="🚀"
          color="border-purple-500"
          link="/staff/orders"
        />
        <StatCard
          title="Active Products"
          value={stats.activeProducts}
          icon="✅"
          color="border-emerald-500"
          link="/staff/products"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Thao Tác Nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            to="/staff/products/create"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition text-center"
          >
            ➕ Tạo Product Mới
          </Link>
          <Link
            to="/staff/categories"
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition text-center"
          >
            📁 Quản lý Categories
          </Link>
          <Link
            to="/staff/orders"
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition text-center"
          >
            🛒 Xử Lý Đơn Hàng
          </Link>
          <Link
            to="/staff/search"
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition text-center"
          >
            🔍 Search Index
          </Link>
        </div>
      </div>

      {/* Pending Orders */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Đơn Hàng Cần Xử Lý</h2>
          <Link to="/staff/orders" className="text-blue-500 hover:text-blue-600 font-medium">Xem tất cả →</Link>
        </div>
        {ordersData?.data?.filter(o => o.status === 'pending').length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Mã đơn</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Khách hàng</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sản phẩm</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Tổng tiền</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ordersData.data.filter(o => o.status === 'pending').slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-medium text-blue-600">{order.orderNumber}</td>
                    <td className="px-4 py-3">{order.user?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{order.items?.length || 0} sản phẩm</td>
                    <td className="px-4 py-3 font-semibold">{parseFloat(order.total).toLocaleString('vi-VN')}₫</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.paymentStatus === 'paid' ? 'Đã TT' : 'Chưa TT'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">Không có đơn hàng nào cần xử lý</div>
        )}
      </div>

      {/* System Tools */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">System Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/staff/cache"
            className="border-2 border-gray-300 hover:border-blue-500 rounded-lg p-4 transition"
          >
            <div className="flex items-center">
              <span className="text-3xl mr-3">🗄️</span>
              <div>
                <h3 className="font-semibold">Cache Management</h3>
                <p className="text-sm text-gray-600">Quản lý Redis cache</p>
              </div>
            </div>
          </Link>
          <Link
            to="/staff/search"
            className="border-2 border-gray-300 hover:border-blue-500 rounded-lg p-4 transition"
          >
            <div className="flex items-center">
              <span className="text-3xl mr-3">🔍</span>
              <div>
                <h3 className="font-semibold">Search Index</h3>
                <p className="text-sm text-gray-600">Quản lý OpenSearch index</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
