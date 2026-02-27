import React, { useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Camera, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import userService from '../../services/userService';

const CreateUser = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'staff',
    avatar: null,
  });

  const [errors, setErrors] = useState({});
  const [avatarPreview, setAvatarPreview] = useState('');

  const createUserMutation = useMutation(
    (userData) => userService.createUser(userData),
    {
      onSuccess: () => {
        toast.success('Tạo tài khoản thành công');
        navigate('/admin/users');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Tạo tài khoản thất bại');
      },
    }
  );

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên không được để trống';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email không được để trống';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.role) {
      newErrors.role = 'Vui lòng chọn vai trò';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu không được để trống';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (formData.avatar && !formData.avatar.type?.startsWith('image/')) {
      newErrors.avatar = 'Vui lòng chọn đúng định dạng ảnh';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const payload = new FormData();
    payload.append('name', formData.name);
    payload.append('email', formData.email);
    payload.append('password', formData.password);
    payload.append('phone', formData.phone);
    payload.append('role', formData.role);
    if (formData.avatar) {
      payload.append('avatar', formData.avatar);
    }

    createUserMutation.mutate(payload);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, avatar: file }));
    if (errors.avatar) {
      setErrors((prev) => ({ ...prev, avatar: '' }));
    }
  };

  useEffect(() => {
    if (!formData.avatar) {
      setAvatarPreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(formData.avatar);
    setAvatarPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [formData.avatar]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Tạo tài khoản mới</h1>
        <p className="text-gray-600 mt-2">Chọn vai trò và nhập thông tin người dùng trước khi tạo tài khoản.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-gradient-to-b from-slate-900 to-slate-700 text-white rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck size={24} />
            <h2 className="text-lg font-semibold">Xem trước hồ sơ</h2>
          </div>

          <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-white/20 flex items-center justify-center mb-4 border border-white/20">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Ảnh đại diện"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserRound size={34} />
              )}
            </div>
            <p className="text-lg font-semibold break-words">{formData.name || 'Tên người dùng'}</p>
            <p className="text-sm text-slate-200 break-words">{formData.email || 'email@example.com'}</p>
            <p className="text-sm text-slate-200 mt-2">Vai trò: {
              formData.role === 'admin' ? 'Quản trị viên' : formData.role === 'customer' ? 'Khách hàng' : 'Nhân viên'
            }</p>
            <p className="text-sm text-slate-200">SĐT: {formData.phone || 'Chưa cập nhật'}</p>
          </div>

          <div className="mt-4 text-sm text-slate-200">
            <p>- Vai trò sẽ áp dụng ngay sau khi tạo.</p>
            <p>- Ảnh đại diện là tùy chọn.</p>
            <p>- Tài khoản được kích hoạt sẵn.</p>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-2xl shadow p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Họ tên <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="Nhập họ tên"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="nguoidung@example.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Vai trò <span className="text-red-500">*</span></label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.role ? 'border-red-500' : ''}`}
                >
                  <option value="staff">Nhân viên</option>
                  <option value="admin">Quản trị viên</option>
                  <option value="customer">Khách hàng</option>
                </select>
                {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Số điện thoại</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0901234567"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 font-semibold mb-2">Ảnh đại diện (tùy chọn)</label>
                <div className="relative">
                  <Camera size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="file"
                    name="avatar"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className={`w-full border rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.avatar ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.avatar && <p className="text-red-500 text-sm mt-1">{errors.avatar}</p>}
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Mật khẩu <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Tối thiểu 6 ký tự"
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Xác nhận mật khẩu <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  placeholder="Nhập lại mật khẩu"
                />
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                disabled={createUserMutation.isLoading}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {createUserMutation.isLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/users')}
                className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-lg transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;
