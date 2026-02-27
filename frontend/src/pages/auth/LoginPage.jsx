import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input } from '../../components/common';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || null;
  const { login, isAuthenticated, user } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (redirect) {
        navigate(redirect);
      } else {
        const redirectPath = user.role === 'admin' ? '/admin/dashboard' : user.role === 'staff' ? '/staff/dashboard' : '/';
        navigate(redirectPath);
      }
    }
  }, [isAuthenticated, user, navigate, redirect]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await login(formData.email, formData.password);
      const userRole = response.data.user.role;
      toast.success('Đăng nhập thành công');
      if (redirect) {
        navigate(redirect);
      } else {
        const redirectPath = userRole === 'admin' ? '/admin/dashboard' : userRole === 'staff' ? '/staff/dashboard' : '/';
        navigate(redirectPath);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 rounded-2xl shadow-xl p-8 border border-zinc-800">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-100">Đăng Nhập</h1>
          <p className="text-gray-400 mt-2">Chào mừng trở lại!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your@email.com"
            required
          />
          <Input
            label="Mật khẩu"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />
          <Button type="submit" loading={isLoading} className="w-full mt-6">
            {isLoading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-amber-500 hover:text-amber-400 font-semibold">
              Đăng ký ngay
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-gray-500 hover:text-gray-300">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
