import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  PlusSquare,
  FolderOpen,
  ShoppingCart,
  Boxes,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const menuItems = [
  { path: '/staff/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
  { path: '/staff/products', label: 'Sản phẩm', icon: Package },
  { path: '/staff/products/create', label: 'Thêm sản phẩm', icon: PlusSquare },
  { path: '/staff/categories', label: 'Danh mục', icon: FolderOpen },
  { path: '/staff/orders', label: 'Đơn hàng', icon: ShoppingCart },
  { path: '/staff/inventory', label: 'Tồn kho', icon: Boxes },
];

const StaffLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-green-800 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-green-700">
          <div className="flex items-center justify-between">
            {isSidebarOpen && <h1 className="text-xl font-bold">Trang nhân viên</h1>}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded hover:bg-green-700">
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
            <Link key={item.path} to={item.path} className={`flex items-center px-4 py-3 hover:bg-green-700 transition ${isActive(item.path) ? 'bg-green-700 border-l-4 border-green-400' : ''}`}>
              <Icon size={20} />
              {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
            </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-green-700">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center font-bold">{user?.name?.charAt(0).toUpperCase()}</div>
            {isSidebarOpen && <div className="ml-3 flex-1"><p className="font-semibold">{user?.name}</p><p className="text-sm text-green-300">{user?.role}</p></div>}
          </div>
          {isSidebarOpen && <button onClick={handleLogout} className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition inline-flex items-center justify-center gap-2"><LogOut size={16} />Đăng xuất</button>}
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-2xl font-bold text-gray-800">{menuItems.find((item) => isActive(item.path))?.label || 'Nhân viên'}</h2>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Xin chào, {user?.name}</span>
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">{user?.name?.charAt(0).toUpperCase()}</div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-100"><Outlet /></main>
      </div>
    </div>
  );
};

export default StaffLayout;
