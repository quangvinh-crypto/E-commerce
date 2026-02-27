import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import categoryService from '../../services/categoryService';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await categoryService.getCategories();
      setCategories(res.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryImages = [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
    'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600',
    'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600',
  ];

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-amber-500">Trang chủ</Link>
          <ChevronRight size={16} />
          <span className="text-gray-100">Danh mục</span>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-100 mb-4">Danh Mục Sản Phẩm</h1>
          <p className="text-xl text-gray-400">Khám phá các danh mục sản phẩm của chúng tôi</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={`/products?category=${category.id}`}
                className="group relative bg-zinc-900 border border-gray-800 rounded-2xl overflow-hidden transition-all duration-300 hover:border-amber-500 hover:-translate-y-1"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={category.image_url || categoryImages[index % categoryImages.length]}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{category.name}</h3>
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                    {category.description || 'Khám phá các sản phẩm trong danh mục này'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      <Package size={16} className="inline mr-1" />
                      {category.productCount || 0} sản phẩm
                    </span>
                    <span className="text-amber-500 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      Xem thêm <ChevronRight size={18} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package size={64} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">Chưa có danh mục nào</p>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default CategoriesPage;
