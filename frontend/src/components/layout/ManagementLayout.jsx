import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  FolderOpen,
  ShoppingCart,
  UserPlus,
  PlusSquare,
  BarChart3,
  Settings,
  Boxes,
  Database,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const adminMenuItems = [
  { path: '/admin/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Quản lý người dùng', icon: Users },
  { path: '/admin/staff/create', label: 'Tạo tài khoản', icon: UserPlus },
  { path: '/admin/products', label: 'Sản phẩm', icon: Package },
  { path: '/admin/categories', label: 'Danh mục', icon: FolderOpen },
  { path: '/admin/orders', label: 'Đơn hàng', icon: ShoppingCart },
  { path: '/admin/inventory', label: 'Tồn kho', icon: Boxes },
  { path: '/admin/cache', label: 'Bộ nhớ đệm', icon: Database },
  { path: '/admin/search', label: 'Chỉ mục tìm kiếm', icon: Search },
  { path: '/admin/reports', label: 'Báo cáo', icon: BarChart3 },
  { path: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

const staffMenuItems = [
  { path: '/staff/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
  { path: '/staff/products', label: 'Sản phẩm', icon: Package },
  { path: '/staff/products/create', label: 'Thêm sản phẩm', icon: PlusSquare },
  { path: '/staff/categories', label: 'Danh mục', icon: FolderOpen },
  { path: '/staff/orders', label: 'Đơn hàng', icon: ShoppingCart },
  { path: '/staff/inventory', label: 'Tồn kho', icon: Boxes },
];

const ManagementLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isAdmin = user?.role === 'admin';
  const menuItems = isAdmin ? adminMenuItems : staffMenuItems;

  const isActive = (path) => {
    if (location.pathname === path) return true;
    return location.pathname.startsWith(`${path}/`);
  };

  const currentTitle = (() => {
    const sorted = [...menuItems].sort((a, b) => b.path.length - a.path.length);
    return sorted.find((item) => isActive(item.path))?.label || (isAdmin ? 'Quản trị' : 'Nhân viên');
  })();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-theme flex h-screen bg-gray-100 text-gray-800">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-gray-800 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {isSidebarOpen && <h1 className="text-xl font-bold">Trang quản trị</h1>}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded hover:bg-gray-700">
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 hover:bg-gray-700 transition ${isActive(item.path) ? 'bg-gray-700 border-l-4 border-blue-500' : ''}`}
              >
                <Icon size={20} />
                {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            {isSidebarOpen && (
              <div className="ml-3 flex-1">
                <p className="font-semibold">{user?.name}</p>
                <p className="text-sm text-gray-400">{user?.role}</p>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <button
              onClick={handleLogout}
              className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition inline-flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              Đăng xuất
            </button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-2xl font-bold text-gray-800">{currentTitle}</h2>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Xin chào, {user?.name}</span>
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ManagementLayout;
