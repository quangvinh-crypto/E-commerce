import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Search, Filter, Grid, List, Plus, Edit2, Trash2, Eye, 
  Package, AlertTriangle, CheckCircle, XCircle, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import { getImageUrl } from '../../utils/imageHelper';
import { useAuth } from '../../contexts/AuthContext';

const ProductManagement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    categoryId: '',
    isActive: '',
    search: '',
    minPrice: '',
    maxPrice: '',
    stockStatus: '',
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });
  const [selectedProducts, setSelectedProducts] = useState([]);

  const managementBasePath = user?.role === 'admin' ? '/admin' : '/staff';

  const { data, isLoading } = useQuery(
    ['products', filters],
    () => productService.getProducts(filters),
    { keepPreviousData: true }
  );

  const { data: categoriesData } = useQuery('categories', () => categoryService.getCategories());

  const deleteProductMutation = useMutation(
    (id) => productService.deleteProduct(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        toast.success('Xóa sản phẩm thành công');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Xóa thất bại');
      },
    }
  );

  const handleDelete = (productId, productName) => {
    if (window.confirm(`Bạn có chắc muốn xóa "${productName}"?`)) {
      deleteProductMutation.mutate(productId);
    }
  };

  const handleBulkDelete = () => {
    if (selectedProducts.length === 0) return;
    if (window.confirm(`Xóa ${selectedProducts.length} sản phẩm đã chọn?`)) {
      selectedProducts.forEach(id => deleteProductMutation.mutate(id));
      setSelectedProducts([]);
    }
  };

  const toggleSelectProduct = (id) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAllProducts = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Tên', 'Giá', 'Số lượng', 'Danh mục', 'Trạng thái'];
    const rows = products.map(p => [
      p.id,
      p.name,
      p.price,
      p.quantity,
      p.category?.name || 'N/A',
      p.isActive ? 'Active' : 'Inactive'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Xuất file thành công');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { label: 'Hết hàng', color: 'bg-red-100 text-red-800', icon: <XCircle size={14} /> };
    if (quantity <= 10) return { label: 'Sắp hết', color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle size={14} /> };
    return { label: 'Còn hàng', color: 'bg-green-100 text-green-800', icon: <CheckCircle size={14} /> };
  };

  const getVariantInfo = (product) => {
    let specs = product.specifications || {};
    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs || '{}');
      } catch (_) {
        specs = {};
      }
    }

    const ram = specs.ram ? `RAM ${specs.ram}` : null;
    const storage = specs.storage ? `ROM ${specs.storage}` : null;

    if (!ram && !storage) return 'Chưa có thông số RAM/ROM';
    return [ram, storage].filter(Boolean).join(' • ');
  };

  const products = data?.data || [];
  const pagination = data?.pagination || {};
  const categories = categoriesData?.data || [];

  const filteredProducts = products.filter(p => {
    if (filters.stockStatus === 'out' && p.quantity > 0) return false;
    if (filters.stockStatus === 'low' && (p.quantity === 0 || p.quantity > 10)) return false;
    if (filters.stockStatus === 'in' && p.quantity <= 10) return false;
    return true;
  });

  const stats = {
    total: pagination.total || products.length,
    active: products.filter(p => p.isActive).length,
    outOfStock: products.filter(p => p.quantity === 0).length,
    lowStock: products.filter(p => p.quantity > 0 && p.quantity <= 10).length,
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản Lý Sản Phẩm</h1>
          <p className="text-gray-600 mt-1">Tổng cộng {stats.total} sản phẩm</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download size={18} /> Xuất CSV
          </button>
          <Link
            to={`${managementBasePath}/products/create`}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg"
          >
            <Plus size={18} /> Thêm sản phẩm
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng sản phẩm</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <Package className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Đang bán</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircle className="text-green-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sắp hết hàng</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
            </div>
            <AlertTriangle className="text-yellow-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Hết hàng</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
            <XCircle className="text-red-500" size={32} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value, page: 1 })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={filters.stockStatus}
            onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value, page: 1 })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả tồn kho</option>
            <option value="in">Còn hàng</option>
            <option value="low">Sắp hết</option>
            <option value="out">Hết hàng</option>
          </select>
          <select
            value={filters.isActive}
            onChange={(e) => setFilters({ ...filters, isActive: e.target.value, page: 1 })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang bán</option>
            <option value="false">Ngừng bán</option>
          </select>
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters({ ...filters, sortBy, sortOrder, page: 1 });
            }}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt-DESC">Mới nhất</option>
            <option value="createdAt-ASC">Cũ nhất</option>
            <option value="price-ASC">Giá thấp → cao</option>
            <option value="price-DESC">Giá cao → thấp</option>
            <option value="quantity-ASC">Tồn kho thấp → cao</option>
            <option value="name-ASC">Tên A-Z</option>
          </select>
          <div className="flex items-center border rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-500'} rounded-l-lg`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-500'} rounded-r-lg`}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedProducts.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center gap-4">
            <span className="text-sm text-gray-600">Đã chọn {selectedProducts.length} sản phẩm</span>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
            >
              Xóa đã chọn
            </button>
            <button
              onClick={() => setSelectedProducts([])}
              className="px-4 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Bỏ chọn
            </button>
          </div>
        )}
      </div>

      {/* Products */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg shadow">
          <Package size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào</p>
          <Link
            to={`${managementBasePath}/products/create`}
            className="inline-flex items-center gap-2 mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg"
          >
            <Plus size={18} /> Thêm sản phẩm mới
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.quantity);
            return (
              <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => toggleSelectProduct(product.id)}
                    className="absolute top-3 left-3 z-10 w-5 h-5 accent-blue-500"
                  />
                  <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {product.images?.length > 0 ? (
                      <img
                        src={getImageUrl(product.images[0])}
                        alt={product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Package size={64} className="text-gray-300" />
                    )}
                  </div>
                  {!product.isActive && (
                    <div className="absolute top-3 right-3 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                      Ngừng bán
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-sm text-gray-500 mb-1">{getVariantInfo(product)}</p>
                  <p className="text-sm text-gray-500 mb-2">{product.category?.name || 'Chưa phân loại'}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-blue-600 font-bold">{formatPrice(product.price)}</span>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${stockStatus.color}`}>
                      {stockStatus.icon} {product.quantity}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`${managementBasePath}/products/${product.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
                    >
                      <Eye size={16} /> Xem
                    </Link>
                    <Link
                      to={`${managementBasePath}/products/${product.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                    >
                      <Edit2 size={16} /> Sửa
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === products.length && products.length > 0}
                    onChange={selectAllProducts}
                    className="w-5 h-5 accent-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Danh mục</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Giá</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tồn kho</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.quantity);
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleSelectProduct(product.id)}
                        className="w-5 h-5 accent-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.images?.length > 0 ? (
                            <img src={getImageUrl(product.images[0])} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={20} className="text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 line-clamp-1">{product.name}</p>
                          <p className="text-xs text-gray-500">{getVariantInfo(product)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.category?.name || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-blue-600">{formatPrice(product.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium w-fit ${stockStatus.color}`}>
                        {stockStatus.icon} {product.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {product.isActive ? 'Đang bán' : 'Ngừng bán'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`${managementBasePath}/products/${product.id}`}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                          title="Xem"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          to={`${managementBasePath}/products/${product.id}/edit`}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                          title="Sửa"
                        >
                          <Edit2 size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Xóa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Trước
          </button>
          {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
            const pageNum = filters.page <= 3 ? i + 1 : filters.page - 2 + i;
            if (pageNum > pagination.totalPages) return null;
            return (
              <button
                key={pageNum}
                onClick={() => setFilters({ ...filters, page: pageNum })}
                className={`px-4 py-2 rounded-lg ${filters.page === pageNum ? 'bg-blue-500 text-white' : 'border hover:bg-gray-50'}`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={filters.page === pagination.totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
