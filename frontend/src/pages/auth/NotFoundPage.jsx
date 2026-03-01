import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NotFoundPage = () => {
  const { user, isAuthenticated } = useAuth();
  const homePath =
    isAuthenticated && user?.role === 'admin'
      ? '/admin/dashboard'
      : isAuthenticated && user?.role === 'staff'
      ? '/staff/dashboard'
      : '/';

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-amber-500">404</h1>
        <h2 className="text-3xl font-semibold text-gray-100 mt-4">Trang Không Tồn Tại</h2>
        <p className="text-gray-400 mt-2 mb-8">Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa</p>
        <Link
          to={homePath}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8 py-3 rounded-lg transition inline-block"
        >
          Về Trang Chủ
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
