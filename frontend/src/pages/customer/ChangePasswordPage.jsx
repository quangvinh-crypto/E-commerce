import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import authService from '../../services/authService';
import toast from 'react-hot-toast';

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const toggleShowPassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (formData.currentPassword === formData.newPassword && formData.newPassword) {
      newErrors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      const res = await authService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (res.success) {
        toast.success('Đổi mật khẩu thành công!');
        navigate('/profile');
      } else {
        toast.error(res.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Có lỗi xảy ra';
      toast.error(message);
      if (message.toLowerCase().includes('incorrect') || message.toLowerCase().includes('sai')) {
        setErrors({ currentPassword: 'Mật khẩu hiện tại không đúng' });
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (password) => {
    if (!password) return { level: 0, text: '', color: '' };
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: strength, text: 'Yếu', color: 'bg-red-500' };
    if (strength <= 3) return { level: strength, text: 'Trung bình', color: 'bg-yellow-500' };
    return { level: strength, text: 'Mạnh', color: 'bg-green-500' };
  };

  const strength = passwordStrength(formData.newPassword);

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/profile"
            className="p-2 text-gray-400 hover:text-amber-500 transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
              <Lock className="text-amber-500" size={32} />
              Đổi Mật Khẩu
            </h1>
            <p className="text-gray-400 mt-1">Cập nhật mật khẩu để bảo mật tài khoản</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <input
                  type={showPassword.current ? 'text' : 'password'}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 pr-12 bg-zinc-800 border ${
                    errors.currentPassword ? 'border-red-500' : 'border-gray-700'
                  } text-gray-100 rounded-lg focus:outline-none focus:border-amber-500 transition-colors`}
                  placeholder="Nhập mật khẩu hiện tại"
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword('current')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword.current ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showPassword.new ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 pr-12 bg-zinc-800 border ${
                    errors.newPassword ? 'border-red-500' : 'border-gray-700'
                  } text-gray-100 rounded-lg focus:outline-none focus:border-amber-500 transition-colors`}
                  placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword('new')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword.new ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.newPassword}</p>
              )}
              {formData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${(strength.level / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs ${strength.color.replace('bg-', 'text-')}`}>
                      {strength.text}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showPassword.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 pr-12 bg-zinc-800 border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-700'
                  } text-gray-100 rounded-lg focus:outline-none focus:border-amber-500 transition-colors`}
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword('confirm')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
              )}
              {formData.confirmPassword &&
                formData.newPassword === formData.confirmPassword && (
                  <p className="mt-1 text-sm text-green-400 flex items-center gap-1">
                    <CheckCircle size={14} /> Mật khẩu khớp
                  </p>
                )}
            </div>

            {/* Tips */}
            <div className="bg-zinc-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Gợi ý mật khẩu mạnh:</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Ít nhất 8 ký tự</li>
                <li>• Kết hợp chữ hoa và chữ thường</li>
                <li>• Có ít nhất 1 số</li>
                <li>• Có ít nhất 1 ký tự đặc biệt (!@#$%...)</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Link
                to="/profile"
                className="flex-1 py-3 text-center border border-gray-700 text-gray-300 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Hủy
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-amber-500 text-black py-3 rounded-lg font-semibold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default ChangePasswordPage;
