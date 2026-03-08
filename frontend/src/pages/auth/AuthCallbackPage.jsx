import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeGoogleLogin } = useAuth();

  useEffect(() => {
    const completeLogin = async () => {
      const token = searchParams.get('token');
      const redirect = searchParams.get('redirect') || '';

      try {
        const data = await completeGoogleLogin(token);
        const role = data.user?.role;

        toast.success('Đăng nhập Google thành công');
        if (redirect) {
          navigate(redirect, { replace: true });
          return;
        }

        const redirectPath = role === 'admin' ? '/admin/dashboard' : role === 'staff' ? '/staff/dashboard' : '/';
        navigate(redirectPath, { replace: true });
      } catch (error) {
        toast.error(error.response?.data?.message || 'Đăng nhập Google thất bại');
        navigate('/login', { replace: true });
      }
    };

    completeLogin();
  }, [completeGoogleLogin, navigate, searchParams]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-gray-100">
      <p>Đang xử lý đăng nhập Google...</p>
    </div>
  );
};

export default AuthCallbackPage;
