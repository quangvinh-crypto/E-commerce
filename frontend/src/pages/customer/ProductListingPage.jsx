import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import { ProductCard } from '../../components/features';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';

const ProductListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    search: searchParams.get('search') || '',
  });
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('order') || 'DESC');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
    updateURL();
  }, [filters, sortBy, sortOrder, page]);

  const fetchCategories = async () => {
    try {
      const res = await categoryService.getCategories();
      setCategories(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        sortBy,
        sortOrder,
        isActive: true,
        categoryId: filters.category || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
      };

      let res;
      if (filters.search) {
        const searchParams = {
          ...params,
          sortBy: sortBy === 'createdAt' ? '_score' : sortBy,
          sortOrder: sortBy === 'createdAt' ? 'desc' : sortOrder,
        };
        res = await productService.searchProducts(filters.search, searchParams);
      } else {
        res = await productService.getProducts(params);
      }

      setProducts(res.data || res.products || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalProducts(res.pagination?.total || res.data?.length || res.products?.length || 0);
    } catch (e) {
      console.error(e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (sortBy !== 'createdAt') params.set('sort', sortBy);
    if (sortOrder !== 'DESC') params.set('order', sortOrder);
    if (page > 1) params.set('page', page.toString());
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput }));
    setPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSortChange = (value) => {
    switch (value) {
      case 'price_asc':
        setSortBy('price');
        setSortOrder('ASC');
        break;
      case 'price_desc':
        setSortBy('price');
        setSortOrder('DESC');
        break;
      case 'name_asc':
        setSortBy('name');
        setSortOrder('ASC');
        break;
      case 'name_desc':
        setSortBy('name');
        setSortOrder('DESC');
        break;
      case 'newest':
      default:
        setSortBy('createdAt');
        setSortOrder('DESC');
        break;
    }
    setPage(1);
  };

  const getCurrentSortValue = () => {
    if (sortBy === 'price' && sortOrder === 'ASC') return 'price_asc';
    if (sortBy === 'price' && sortOrder === 'DESC') return 'price_desc';
    if (sortBy === 'name' && sortOrder === 'ASC') return 'name_asc';
    if (sortBy === 'name' && sortOrder === 'DESC') return 'name_desc';
    return 'newest';
  };

  const clearFilters = () => {
    setFilters({ category: '', minPrice: '', maxPrice: '', search: '' });
    setSearchInput('');
    setSortBy('createdAt');
    setSortOrder('DESC');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = filters.category || filters.minPrice || filters.maxPrice || filters.search;

  const priceRanges = [
    { label: 'Dưới 5 triệu', min: '', max: '5000000' },
    { label: '5 - 10 triệu', min: '5000000', max: '10000000' },
    { label: '10 - 20 triệu', min: '10000000', max: '20000000' },
    { label: '20 - 30 triệu', min: '20000000', max: '30000000' },
    { label: 'Trên 30 triệu', min: '30000000', max: '' },
  ];

  const FilterSidebar = ({ isMobile = false }) => (
    <div className={`${isMobile ? '' : 'bg-zinc-900 border border-gray-800 rounded-xl p-6'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <SlidersHorizontal size={20} />
          Bộ Lọc
        </h3>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-sm text-amber-500 hover:text-amber-400">
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-100 mb-3">Danh Mục</h4>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer group">
            <input
              type="radio"
              name="category"
              checked={!filters.category}
              onChange={() => handleFilterChange('category', '')}
              className="w-4 h-4 text-amber-500 bg-zinc-800 border-gray-700"
            />
            <span className="ml-2 text-sm text-gray-400 group-hover:text-gray-300">Tất cả</span>
          </label>
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="category"
                checked={filters.category === cat.id.toString()}
                onChange={() => handleFilterChange('category', cat.id.toString())}
                className="w-4 h-4 text-amber-500 bg-zinc-800 border-gray-700"
              />
              <span className="ml-2 text-sm text-gray-400 group-hover:text-gray-300">{cat.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Presets */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-100 mb-3">Khoảng Giá</h4>
        <div className="space-y-2">
          {priceRanges.map((range, idx) => (
            <label key={idx} className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="priceRange"
                checked={filters.minPrice === range.min && filters.maxPrice === range.max}
                onChange={() => {
                  setFilters((prev) => ({ ...prev, minPrice: range.min, maxPrice: range.max }));
                  setPage(1);
                }}
                className="w-4 h-4 text-amber-500 bg-zinc-800 border-gray-700"
              />
              <span className="ml-2 text-sm text-gray-400 group-hover:text-gray-300">{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Custom Price Range */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-100 mb-3">Giá Tùy Chỉnh</h4>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Từ"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg placeholder-gray-500 text-sm"
          />
          <span className="text-gray-500">-</span>
          <input
            type="number"
            placeholder="Đến"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg placeholder-gray-500 text-sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-400 mb-6">Trang chủ / Sản phẩm</div>

        {/* Search Bar */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm kiếm sản phẩm theo tên..."
                className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-gray-800 text-gray-100 rounded-xl focus:outline-none focus:border-amber-500 transition-colors placeholder-gray-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors"
            >
              Tìm kiếm
            </button>
          </form>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-500 rounded-full text-sm">
                Tìm: "{filters.search}"
                <button onClick={() => { setFilters((prev) => ({ ...prev, search: '' })); setSearchInput(''); }}>
                  <X size={14} />
                </button>
              </span>
            )}
            {filters.category && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-500 rounded-full text-sm">
                {categories.find((c) => c.id.toString() === filters.category)?.name}
                <button onClick={() => handleFilterChange('category', '')}>
                  <X size={14} />
                </button>
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-500 rounded-full text-sm">
                Giá: {filters.minPrice ? `${parseInt(filters.minPrice).toLocaleString()}đ` : '0'} -{' '}
                {filters.maxPrice ? `${parseInt(filters.maxPrice).toLocaleString()}đ` : '∞'}
                <button onClick={() => setFilters((prev) => ({ ...prev, minPrice: '', maxPrice: '' }))}>
                  <X size={14} />
                </button>
              </span>
            )}
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FilterSidebar />
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="bg-zinc-900 border border-gray-800 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowMobileFilters(true)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-100 rounded-lg hover:bg-zinc-800"
                  >
                    <Filter size={18} />
                    Bộ lọc
                  </button>
                  <p className="text-gray-400">
                    Tìm thấy <span className="font-semibold text-amber-500">{totalProducts}</span> sản phẩm
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Sắp xếp:</span>
                  <div className="relative">
                    <select
                      value={getCurrentSortValue()}
                      onChange={(e) => handleSortChange(e.target.value)}
                      className="appearance-none px-4 py-2 pr-10 bg-zinc-800 border border-gray-700 text-gray-100 rounded-lg cursor-pointer focus:outline-none focus:border-amber-500"
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="price_asc">Giá: Thấp đến Cao</option>
                      <option value="price_desc">Giá: Cao đến Thấp</option>
                      <option value="name_asc">Tên: A - Z</option>
                      <option value="name_desc">Tên: Z - A</option>
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-zinc-900 border border-gray-800 text-gray-100 rounded-lg disabled:opacity-50 hover:bg-zinc-800 transition-colors"
                    >
                      Trước
                    </button>
                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={i}
                          onClick={() => setPage(pageNum)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            page === pageNum
                              ? 'bg-amber-500 text-black font-semibold'
                              : 'bg-zinc-900 border border-gray-800 text-gray-100 hover:bg-zinc-800'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-zinc-900 border border-gray-800 text-gray-100 rounded-lg disabled:opacity-50 hover:bg-zinc-800 transition-colors"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 bg-zinc-900 border border-gray-800 rounded-xl">
                <Search size={48} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg mb-2">Không tìm thấy sản phẩm nào</p>
                <p className="text-gray-500 text-sm">Thử thay đổi từ khóa hoặc bộ lọc</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-6 py-2 bg-amber-500 text-black rounded-lg font-semibold hover:bg-amber-400 transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden">
          <div className="absolute right-0 top-0 h-full w-80 bg-zinc-950 border-l border-gray-800 overflow-y-auto">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">Bộ Lọc</h3>
              <button onClick={() => setShowMobileFilters(false)} className="text-gray-400 hover:text-gray-100">
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              <FilterSidebar isMobile />
            </div>
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-3 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors"
              >
                Áp dụng ({totalProducts} sản phẩm)
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
};

export default ProductListingPage;
