import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, Facebook, Twitter, Instagram, Youtube, Heart, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';

const CustomerLayout = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { getCartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const handleSearch = (e) => { e.preventDefault(); if (searchQuery.trim()) { navigate(`/products?search=${encodeURIComponent(searchQuery)}`); setSearchQuery(''); } };
  const handleLogout = () => { logout(); setProfileMenuOpen(false); navigate('/'); };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { to: '/', label: 'Trang chủ' },
    { to: '/products', label: 'Sản phẩm' },
    { to: '/categories', label: 'Danh mục' },
    { href: '/#about', label: 'Về chúng tôi' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <Link to="/" className="text-2xl font-bold text-amber-500 hover:text-amber-400 transition-colors">E-Commerce</Link>
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm kiếm sản phẩm..." className="w-full px-6 py-3 bg-zinc-800 text-gray-100 rounded-full border border-gray-700 focus:outline-none focus:border-amber-500 transition-colors placeholder-gray-500" />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-amber-500 transition-colors"><Search size={20} /></button>
              </div>
            </form>
            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <Link to="/wishlist" className="relative p-2 text-white hover:text-amber-500 transition-colors">
                  <Heart size={24} />
                  {wishlistCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{wishlistCount}</span>}
                </Link>
              )}
              <Link to="/cart" className="relative p-2 text-white hover:text-amber-500 transition-colors">
                <ShoppingCart size={24} />
                {getCartCount() > 0 && <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{getCartCount()}</span>}
              </Link>
              {isAuthenticated ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 p-2 text-white hover:text-amber-500 transition-colors"
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="menu"
                  >
                    <img
                      src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.email || 'User')}&background=f59e0b&color=111827&size=64`}
                      alt={user?.name || user?.email || 'User'}
                      className="w-8 h-8 rounded-full object-cover border border-amber-500/30"
                    />
                    <span className="hidden lg:block max-w-[170px] truncate text-sm font-medium">{user?.email}</span>
                    <ChevronDown size={16} className={`hidden lg:block transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-zinc-900 rounded-lg shadow-lg border border-gray-800 py-2">
                    <Link to="/profile" onClick={() => setProfileMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-300 hover:bg-zinc-800 hover:text-amber-500 transition-colors">Tài khoản của tôi</Link>
                    <Link to="/profile/orders" onClick={() => setProfileMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-300 hover:bg-zinc-800 hover:text-amber-500 transition-colors">Đơn hàng của tôi</Link>
                    <Link to="/wishlist" onClick={() => setProfileMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-300 hover:bg-zinc-800 hover:text-amber-500 transition-colors">Sản phẩm yêu thích</Link>
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors">Đăng xuất</button>
                  </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="bg-amber-500 text-black px-6 py-2 rounded-full font-semibold hover:bg-amber-400 transition-all duration-300">Đăng nhập</Link>
              )}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-white">{mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
            </div>
          </div>
          <nav className="hidden md:flex items-center justify-center gap-8 py-3 border-t border-gray-800">
            {navLinks.map((link, idx) => link.to ? (
              <Link key={idx} to={link.to} className="text-white hover:text-amber-500 transition-colors duration-200 relative group">{link.label}<span className="absolute bottom-0 left-0 w-0 h-0.5 bg-amber-500 group-hover:w-full transition-all duration-200" /></Link>
            ) : (
              <a key={idx} href={link.href} className="text-white hover:text-amber-500 transition-colors duration-200 relative group">{link.label}<span className="absolute bottom-0 left-0 w-0 h-0.5 bg-amber-500 group-hover:w-full transition-all duration-200" /></a>
            ))}
          </nav>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-zinc-900">
            <div className="px-4 py-4 space-y-3">
              <form onSubmit={handleSearch} className="flex mb-4">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm kiếm..." className="flex-1 px-4 py-2 bg-zinc-800 text-gray-100 rounded-l-lg border border-gray-700 focus:outline-none focus:border-amber-500" />
                <button type="submit" className="px-4 bg-amber-500 text-black rounded-r-lg hover:bg-amber-400 transition-colors"><Search size={20} /></button>
              </form>
              {navLinks.map((link, idx) => link.to ? <Link key={idx} to={link.to} className="block py-2 text-gray-300 hover:text-amber-500 transition-colors">{link.label}</Link> : <a key={idx} href={link.href} className="block py-2 text-gray-300 hover:text-amber-500 transition-colors">{link.label}</a>)}
            </div>
          </div>
        )}
      </header>
      <main>{children}</main>
      <footer className="bg-black border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div><h3 className="text-xl font-bold text-amber-500 mb-4">E-Commerce</h3><p className="text-gray-400 mb-4">Nền tảng mua sắm công nghệ hàng đầu Việt Nam</p><div className="flex gap-4"><a href="/#" className="text-gray-400 hover:text-amber-500 transition-colors"><Facebook size={20} /></a><a href="/#" className="text-gray-400 hover:text-amber-500 transition-colors"><Twitter size={20} /></a><a href="/#" className="text-gray-400 hover:text-amber-500 transition-colors"><Instagram size={20} /></a><a href="/#" className="text-gray-400 hover:text-amber-500 transition-colors"><Youtube size={20} /></a></div></div>
            <div><h4 className="text-lg font-semibold text-gray-100 mb-4">Về Chúng Tôi</h4><ul className="space-y-2"><li><a href="/#" className="text-gray-400 hover:text-amber-500 transition-colors">Giới thiệu</a></li><li><a href="/#" className="text-gray-400 hover:text-amber-500 transition-colors">Liên hệ</a></li><li><a href="/#" className="text-gray-400 hover:text-amber-500 transition-colors">Tuyển dụng</a></li></ul></div>
            <div><h4 className="text-lg font-semibold text-gray-100 mb-4">Chính Sách</h4><ul className="space-y-2"><li><a href="/#" className="text-gray-400 hover:text-amber-500 transition-colors">Chính sách bảo mật</a></li><li><a href="/#" className="text-gray-400 hover:text-amber-500 transition-colors">Điều khoản sử dụng</a></li><li><a href="/#" className="text-gray-400 hover:text-amber-500 transition-colors">Chính sách đổi trả</a></li></ul></div>
            <div><h4 className="text-lg font-semibold text-gray-100 mb-4">Hỗ Trợ</h4><ul className="space-y-2 text-gray-400"><li>Hotline: 1900-xxxx</li><li>Email: support@ecommerce.vn</li><li>8:00 - 22:00 (Hàng ngày)</li></ul></div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center"><p className="text-gray-500">&copy; 2024 E-Commerce. All rights reserved.</p></div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;
