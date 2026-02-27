import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, HeadphonesIcon, RotateCcw, Shield, ChevronRight, ArrowRight } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import { ProductCard } from '../../components/features';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        productService.getProducts({ limit: 8, sort: 'createdAt', order: 'desc' }),
        categoryService.getCategories({ limit: 6 }),
      ]);
      setFeaturedProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) { console.error('Error fetching data:', error); }
    finally { setLoading(false); }
  };

  const handleNewsletterSubmit = (e) => { e.preventDefault(); console.log('Newsletter subscription:', email); setEmail(''); };

  const trustBadges = [
    { icon: <Truck size={32} />, title: 'Miễn Phí Vận Chuyển', description: 'Cho đơn hàng trên 500.000₫' },
    { icon: <HeadphonesIcon size={32} />, title: 'Hỗ Trợ 24/7', description: 'Liên hệ hỗ trợ mọi lúc' },
    { icon: <RotateCcw size={32} />, title: 'Hoàn Tiền 100%', description: 'Trong vòng 30 ngày' },
    { icon: <Shield size={32} />, title: 'Thanh Toán An Toàn', description: 'Bảo mật tuyệt đối' },
  ];

  return (
    <CustomerLayout>
      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1920&q=80" alt="Tech Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/85 to-zinc-950"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-100 to-amber-500 bg-clip-text text-transparent">Premium Tech Store</h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl leading-relaxed">Khám phá công nghệ tiên tiến với ưu đãi độc quyền</p>
          <div className="flex flex-col sm:flex-row gap-6">
            <Link to="/products" className="group bg-amber-500 text-black px-10 py-5 rounded-full font-bold text-lg hover:bg-amber-400 transition-all duration-300 inline-flex items-center gap-2">Mua Ngay<ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} /></Link>
            <Link to="/products" className="border-2 border-white text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-white/10 transition-all duration-300">Xem Thêm</Link>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"><ChevronRight className="rotate-90 text-amber-500" size={32} /></div>
      </section>

      <section className="py-16 bg-zinc-900/50 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustBadges.map((badge, index) => (
              <div key={index} className="flex flex-col items-center text-center group">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors duration-300"><div className="text-amber-500">{badge.icon}</div></div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">{badge.title}</h3>
                <p className="text-sm text-gray-400">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12"><h2 className="text-4xl md:text-5xl font-bold text-gray-100 mb-4">Danh Mục Nổi Bật</h2><p className="text-xl text-gray-400">Khám phá các danh mục phổ biến</p></div>
          {loading ? <div className="flex justify-center py-20"><div className="spinner"></div></div> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.slice(0, 6).map((category, index) => (
                <Link key={category.id} to={`/products?category=${category.id}`} className={`${index === 0 ? 'col-span-2 row-span-2' : ''} relative group overflow-hidden rounded-2xl aspect-square`}>
                  <img src={category.image_url || 'https://via.placeholder.com/600'} alt={category.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 transform transition-transform duration-300 group-hover:translate-y-[-8px]">
                    <h3 className={`${index === 0 ? 'text-2xl md:text-3xl' : 'text-xl'} font-bold text-white mb-1`}>{category.name}</h3>
                    <p className="text-sm text-gray-300">50+ sản phẩm</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div><h2 className="text-4xl md:text-5xl font-bold text-gray-100 mb-2">Sản Phẩm Bán Chạy</h2><p className="text-xl text-gray-400">Những sản phẩm được yêu thích nhất</p></div>
            <Link to="/products" className="hidden md:flex items-center gap-2 text-amber-500 hover:text-amber-400 font-medium transition-colors">Xem tất cả<ChevronRight size={20} /></Link>
          </div>
          {loading ? <div className="flex justify-center py-20"><div className="spinner"></div></div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          )}
        </div>
      </section>

      <section id="about" className="py-20 bg-zinc-950 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12"><h2 className="text-4xl md:text-5xl font-bold text-gray-100 mb-4">Về Chúng Tôi</h2><p className="text-xl text-gray-400">Đội ngũ đam mê công nghệ, cam kết chất lượng</p></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="relative"><img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80" alt="Our Team" className="w-full h-96 object-cover rounded-3xl shadow-2xl" /><div className="absolute -bottom-6 -right-6 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl"></div></div>
            <div>
              <p className="text-lg text-gray-400 mb-6 leading-relaxed">Được thành lập từ năm 2014, E-Commerce bắt đầu từ một cửa hàng nhỏ với niềm đam mê công nghệ và mong muốn mang đến những sản phẩm chất lượng cho người Việt Nam.</p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center"><div className="text-4xl font-bold text-amber-500 mb-2">10+</div><div className="text-gray-400">Năm kinh nghiệm</div></div>
                <div className="text-center"><div className="text-4xl font-bold text-amber-500 mb-2">50K+</div><div className="text-gray-400">Khách hàng</div></div>
                <div className="text-center"><div className="text-4xl font-bold text-amber-500 mb-2">100K+</div><div className="text-gray-400">Sản phẩm</div></div>
                <div className="text-center"><div className="text-4xl font-bold text-amber-500 mb-2">99%</div><div className="text-gray-400">Hài lòng</div></div>
              </div>
              <Link to="/products" className="inline-flex items-center gap-2 bg-amber-500 text-black px-8 py-4 rounded-full font-semibold hover:bg-amber-400 transition-all duration-300">Khám phá sản phẩm<ArrowRight size={20} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 relative overflow-hidden">
        <div className="absolute inset-0 pattern-dots"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-100 mb-4">Đăng Ký Nhận Ưu Đãi</h2>
          <p className="text-xl text-gray-400 mb-8">Nhận ngay mã giảm giá 10% cho đơn hàng đầu tiên</p>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email của bạn" required className="flex-1 px-6 py-4 bg-zinc-800 text-gray-100 rounded-full border border-gray-700 focus:border-amber-500 focus:outline-none transition-colors placeholder-gray-500" />
            <button type="submit" className="bg-amber-500 text-black px-8 py-4 rounded-full font-semibold hover:bg-amber-400 transition-all duration-300 whitespace-nowrap">Đăng Ký</button>
          </form>
        </div>
      </section>
    </CustomerLayout>
  );
};

export default HomePage;
