import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import {
  Users, Search, Filter, UserPlus, Edit2, Trash2, Shield,
  ShieldCheck, ShieldAlert, Mail, Phone, Calendar, MoreVertical,
  CheckCircle, XCircle, Download, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import userService from '../../services/userService';
import orderService from '../../services/orderService';

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    role: '',
    isActive: '',
    search: '',
    page: 1,
    limit: 10,
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery(
    ['users', filters],
    () => userService.getUsers(filters),
    { keepPreviousData: true }
  );

  const { data: ordersData } = useQuery('all-orders', () =>
    orderService.getAllOrders({ limit: 10000 })
  );

  const updateUserMutation = useMutation(
    ({ id, userData }) => userService.updateUser(id, userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('Cập nhật thành công');
        setShowModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Cập nhật thất bại');
      },
    }
  );

  const deleteUserMutation = useMutation(
    (id) => userService.deleteUser(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('Đã vô hiệu hóa tài khoản');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Thao tác thất bại');
      },
    }
  );

  const handleRoleChange = (userId, newRole) => {
    if (window.confirm(`Đổi quyền thành ${newRole.toUpperCase()}?`)) {
      updateUserMutation.mutate({ id: userId, userData: { role: newRole } });
    }
  };

  const handleToggleActive = (userId, currentStatus) => {
    const action = currentStatus ? 'vô hiệu hóa' : 'kích hoạt';
    if (window.confirm(`Bạn có chắc muốn ${action} tài khoản này?`)) {
      updateUserMutation.mutate({ id: userId, userData: { isActive: !currentStatus } });
    }
  };

  const handleDelete = (userId) => {
    if (window.confirm('Vô hiệu hóa tài khoản này?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const getUserOrderStats = (userId) => {
    const userOrders = (ordersData?.data || []).filter(o => o.userId === userId);
    const totalSpent = userOrders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    return { orderCount: userOrders.length, totalSpent };
  };

  const exportCSV = () => {
    const headers = ['ID', 'Tên', 'Email', 'SĐT', 'Role', 'Trạng thái', 'Ngày tạo'];
    const rows = users.map(u => [
      u.id,
      u.name,
      u.email,
      u.phone || 'N/A',
      u.role,
      u.isActive ? 'Đang hoạt động' : 'Đã khóa',
      new Date(u.createdAt).toLocaleDateString('vi-VN')
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Xuất file thành công');
  };

  const formatPrice = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString('vi-VN');
  };

  const users = data?.data || [];
  const pagination = data?.pagination || {};

  const stats = {
    total: pagination.total || users.length,
    customers: users.filter(u => u.role === 'customer').length,
    staff: users.filter(u => u.role === 'staff').length,
    admins: users.filter(u => u.role === 'admin').length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
  };

  const getRoleBadge = (role) => {
    const config = {
      admin: { color: 'bg-red-100 text-red-700 border-red-200', icon: <ShieldAlert size={14} /> },
      staff: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <ShieldCheck size={14} /> },
      customer: { color: 'bg-green-100 text-green-700 border-green-200', icon: <Shield size={14} /> },
    };
    const c = config[role] || config.customer;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${c.color}`}>
        {c.icon} {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản Lý Người Dùng</h1>
          <p className="text-gray-500">Quản lý tất cả người dùng trong hệ thống</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg hover:bg-slate-50"
          >
            <Download size={18} /> Xuất CSV
          </button>
          <Link
            to="/admin/staff/create"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm"
          >
            <UserPlus size={18} /> Tạo tài khoản
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="text-gray-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500">Tổng người dùng</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.customers}</p>
              <p className="text-xs text-gray-500">Khách hàng</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.staff}</p>
              <p className="text-xs text-gray-500">Nhân viên</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ShieldAlert className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.admins}</p>
              <p className="text-xs text-gray-500">Quản trị viên</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-emerald-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
              <p className="text-xs text-gray-500">Đang hoạt động</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <XCircle className="text-gray-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.inactive}</p>
              <p className="text-xs text-gray-500">Đã khóa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Tìm theo tên, email, SĐT..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả roles</option>
            <option value="customer">Khách hàng</option>
            <option value="staff">Nhân viên</option>
            <option value="admin">Quản trị viên</option>
          </select>
          <select
            value={filters.isActive}
            onChange={(e) => setFilters({ ...filters, isActive: e.target.value, page: 1 })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã khóa</option>
          </select>
          <button
            onClick={() => setFilters({ role: '', isActive: '', search: '', page: 1, limit: 10 })}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg border border-transparent"
          >
            Đặt lại
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <Users size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Không tìm thấy người dùng</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Người dùng</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Liên hệ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vai trò</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Đơn hàng</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Chi tiêu</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => {
                  const orderStats = getUserOrderStats(user.id);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            user.role === 'admin' ? 'bg-red-500' :
                            user.role === 'staff' ? 'bg-blue-500' : 'bg-green-500'
                          }`}>
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{user.name}</p>
                            <p className="text-xs text-gray-500">ID: {user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail size={14} /> {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Phone size={14} /> {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="text-sm border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="customer">Khách hàng</option>
                          <option value="staff">Nhân viên</option>
                          <option value="admin">Quản trị viên</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">{orderStats.orderCount}</span>
                        <span className="text-sm text-gray-400 ml-1">đơn</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-green-600">{formatPrice(orderStats.totalSpent)}₫</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            user.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {user.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { setSelectedUser(user); setShowModal(true); }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Xem chi tiết"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Vô hiệu hóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page === 1}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50"
          >
            Trước
          </button>
          <span className="px-4 py-2 text-gray-600">
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

      {/* User Detail Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Chi tiết người dùng</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white font-bold ${
                  selectedUser.role === 'admin' ? 'bg-red-500' :
                  selectedUser.role === 'staff' ? 'bg-blue-500' : 'bg-green-500'
                }`}>
                  {selectedUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-800">{selectedUser.name}</h4>
                  {getRoleBadge(selectedUser.role)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Số điện thoại</p>
                  <p className="font-medium">{selectedUser.phone || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ngày tạo</p>
                  <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Trạng thái</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedUser.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedUser.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h5 className="font-semibold text-gray-800 mb-3">Thống kê mua hàng</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-blue-600">{getUserOrderStats(selectedUser.id).orderCount}</p>
                    <p className="text-sm text-gray-500">Đơn hàng</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-600">
                      {formatPrice(getUserOrderStats(selectedUser.id).totalSpent)}₫
                    </p>
                    <p className="text-sm text-gray-500">Tổng chi tiêu</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleToggleActive(selectedUser.id, selectedUser.isActive)}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    selectedUser.isActive
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {selectedUser.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border rounded-lg font-medium hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
