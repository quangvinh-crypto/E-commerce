import { useState, useEffect } from 'react';
import { User, Package, Heart, MapPin, LogOut, Camera, Lock, ChevronRight, Edit2 } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import toast from 'react-hot-toast';

const UserProfilePage = () => {
  const { user, logout } = useAuth();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    phone: '',
    avatar: null,
  });
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({ name: '', phone: '', address: '', isDefault: false });
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    fetchProfile();
    loadAddresses();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authService.getCurrentUser();
      if (res.success && res.data) {
        setProfileData({
          username: res.data.username || res.data.name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          avatar: res.data.avatar || null,
        });
      }
    } catch (e) {
      if (user) {
        setProfileData({
          username: user.username || user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          avatar: user.avatar || null,
        });
      }
    }
  };

  const loadAddresses = () => {
    const saved = localStorage.getItem('userAddresses');
    if (saved) setAddresses(JSON.parse(saved));
  };

  const saveAddresses = (newAddresses) => {
    localStorage.setItem('userAddresses', JSON.stringify(newAddresses));
    setAddresses(newAddresses);
  };

  const handleChange = (e) => {
    setProfileData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await authService.updateProfile({
        username: profileData.username,
        email: profileData.email,
        phone: profileData.phone,
      });
      if (res.success) {
        toast.success('Cập nhật thành công!');
        setIsEditing(false);
        await fetchProfile();
      } else {
        toast.error(res.message || 'Có lỗi xảy ra');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = (e) => {
    e.preventDefault();
    if (!newAddress.name || !newAddress.phone || !newAddress.address) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    const newAddresses = [...addresses];
    if (newAddress.isDefault) {
      newAddresses.forEach((addr) => (addr.isDefault = false));
    }
    newAddresses.push({ ...newAddress, id: Date.now() });
    saveAddresses(newAddresses);
    setNewAddress({ name: '', phone: '', address: '', isDefault: false });
    setShowAddressForm(false);
    toast.success('Đã thêm địa chỉ');
  };

  const handleDeleteAddress = (id) => {
    const newAddresses = addresses.filter((addr) => addr.id !== id);
    saveAddresses(newAddresses);
    toast.success('Đã xóa địa chỉ');
  };

  const handleSetDefaultAddress = (id) => {
    const newAddresses = addresses.map((addr) => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    saveAddresses(newAddresses);
    toast.success('Đã đặt làm địa chỉ mặc định');
  };

  const menuItems = [
    { id: 'profile', label: 'Thông tin cá nhân', icon: <User size={20} /> },
    { id: 'orders', label: 'Đơn hàng của tôi', icon: <Package size={20} />, link: '/profile/orders' },
    { id: 'wishlist', label: 'Sản phẩm yêu thích', icon: <Heart size={20} />, link: '/wishlist', badge: wishlistCount },
    { id: 'addresses', label: 'Địa chỉ', icon: <MapPin size={20} /> },
    { id: 'password', label: 'Đổi mật khẩu', icon: <Lock size={20} />, link: '/profile/change-password' },
  ];

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-8">Tài Khoản Của Tôi</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-amber-500 overflow-hidden flex items-center justify-center text-3xl text-amber-500">
                    {profileData.avatar ? (
                      <img src={profileData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      profileData.username?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-amber-400 transition-colors">
                    <Camera size={16} className="text-black" />
                    <input type="file" accept="image/*" className="hidden" />
                  </label>
                </div>
                <h3 className="mt-4 font-semibold text-gray-100">{profileData.username}</h3>
                <p className="text-sm text-gray-400">{profileData.email}</p>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => (item.link ? navigate(item.link) : setActiveTab(item.id))}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${
                      activeTab === item.id ? 'bg-amber-500/10 text-amber-500' : 'text-gray-400 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge > 0 && (
                        <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight size={16} />
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-zinc-800 transition"
                >
                  <LogOut size={20} />
                  <span>Đăng xuất</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-100">Thông Tin Cá Nhân</h2>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors"
                    >
                      <Edit2 size={18} />
                      Chỉnh sửa
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Tên hiển thị</label>
                        <input
                          type="text"
                          name="username"
                          value={profileData.username}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={profileData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Số điện thoại</label>
                        <input
                          type="tel"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleChange}
                          placeholder="Nhập số điện thoại"
                          className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          fetchProfile();
                        }}
                        className="px-6 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-amber-500 text-black px-8 py-2.5 rounded-lg font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
                      >
                        {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-zinc-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Tên hiển thị</p>
                        <p className="text-gray-100 font-medium">{profileData.username || '---'}</p>
                      </div>
                      <div className="bg-zinc-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Email</p>
                        <p className="text-gray-100 font-medium">{profileData.email || '---'}</p>
                      </div>
                      <div className="bg-zinc-800/50 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Số điện thoại</p>
                        <p className="text-gray-100 font-medium">{profileData.phone || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-800">
                      <Link
                        to="/profile/change-password"
                        className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors"
                      >
                        <Lock size={18} />
                        Đổi mật khẩu
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="bg-zinc-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-100">Địa Chỉ Giao Hàng</h2>
                  <button
                    onClick={() => setShowAddressForm(!showAddressForm)}
                    className="bg-amber-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-amber-400 transition-colors"
                  >
                    + Thêm địa chỉ
                  </button>
                </div>

                {showAddressForm && (
                  <form onSubmit={handleAddAddress} className="bg-zinc-800/50 rounded-lg p-4 mb-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Họ tên người nhận</label>
                        <input
                          type="text"
                          value={newAddress.name}
                          onChange={(e) => setNewAddress((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:border-amber-500"
                          placeholder="Nguyễn Văn A"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Số điện thoại</label>
                        <input
                          type="tel"
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress((prev) => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:border-amber-500"
                          placeholder="0901234567"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Địa chỉ chi tiết</label>
                      <textarea
                        value={newAddress.address}
                        onChange={(e) => setNewAddress((prev) => ({ ...prev, address: e.target.value }))}
                        rows={2}
                        className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:border-amber-500 resize-none"
                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={newAddress.isDefault}
                        onChange={(e) => setNewAddress((prev) => ({ ...prev, isDefault: e.target.checked }))}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <label htmlFor="isDefault" className="text-sm text-gray-300">
                        Đặt làm địa chỉ mặc định
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-zinc-800"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-amber-500 text-black rounded-lg font-semibold hover:bg-amber-400"
                      >
                        Lưu địa chỉ
                      </button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin size={48} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">Chưa có địa chỉ nào</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`border rounded-lg p-4 ${
                          addr.isDefault ? 'border-amber-500 bg-amber-500/5' : 'border-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-100">{addr.name}</span>
                              <span className="text-gray-400">|</span>
                              <span className="text-gray-300">{addr.phone}</span>
                              {addr.isDefault && (
                                <span className="bg-amber-500 text-black text-xs px-2 py-0.5 rounded font-medium">
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-sm">{addr.address}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!addr.isDefault && (
                              <button
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-sm text-amber-500 hover:text-amber-400"
                              >
                                Đặt mặc định
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-sm text-red-400 hover:text-red-300"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default UserProfilePage;
