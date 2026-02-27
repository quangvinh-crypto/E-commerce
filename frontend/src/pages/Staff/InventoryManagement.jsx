import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Package, AlertTriangle, TrendingDown, TrendingUp, 
  Search, Filter, Edit2, Save, X, History, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import { getImageUrl } from '../../utils/imageHelper';

const InventoryManagement = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    stockStatus: '',
    page: 1,
    limit: 20,
    sortBy: 'quantity',
    sortOrder: 'ASC',
  });
  const [editingId, setEditingId] = useState(null);
  const [editQuantity, setEditQuantity] = useState(0);
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const { data, isLoading } = useQuery(
    ['inventory', filters],
    () => productService.getProducts({ ...filters, limit: 100 }),
    { keepPreviousData: true }
  );

  const { data: categoriesData } = useQuery('categories', () => categoryService.getCategories());

  const updateStockMutation = useMutation(
    ({ id, quantity }) => productService.updateProduct(id, { quantity }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('inventory');
        queryClient.invalidateQueries('products');
        toast.success('Cập nhật tồn kho thành công');
        setEditingId(null);
        setAdjustmentNote('');
      },
      onError: () => {
        toast.error('Cập nhật thất bại');
      },
    }
  );

  const handleStartEdit = (product) => {
    setEditingId(product.id);
    setEditQuantity(product.quantity);
  };

  const handleSaveStock = (productId) => {
    if (editQuantity < 0) {
      toast.error('Số lượng không được âm');
      return;
    }
    updateStockMutation.mutate({ id: productId, quantity: editQuantity });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditQuantity(0);
    setAdjustmentNote('');
  };

  const exportInventory = () => {
    const headers = ['ID', 'Tên sản phẩm', 'Danh mục', 'Tồn kho', 'Giá', 'Trạng thái'];
    const rows = products.map(p => [
      p.id,
      p.name,
      p.category?.name || 'N/A',
      p.quantity,
      p.price,
      p.quantity === 0 ? 'Hết hàng' : p.quantity <= 10 ? 'Sắp hết' : 'Còn hàng'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Xuất báo cáo thành công');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const products = data?.data || [];
  const categories = categoriesData?.data || [];

  const filteredProducts = products.filter(p => {
    if (filters.stockStatus === 'out' && p.quantity > 0) return false;
    if (filters.stockStatus === 'low' && (p.quantity === 0 || p.quantity > 10)) return false;
    if (filters.stockStatus === 'in' && p.quantity <= 0) return false;
    return true;
  });

  const stats = {
    total: products.length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.quantity), 0),
    outOfStock: products.filter(p => p.quantity === 0).length,
    lowStock: products.filter(p => p.quantity > 0 && p.quantity <= 10).length,
    inStock: products.filter(p => p.quantity > 10).length,
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản Lý Tồn Kho</h1>
          <p className="text-gray-600 mt-1">Theo dõi và cập nhật số lượng sản phẩm</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportInventory}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download size={18} /> Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng SKU</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <Package className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Giá trị tồn kho</p>
              <p className="text-xl font-bold text-emerald-600">
                {(stats.totalValue / 1000000).toFixed(1)}M
              </p>
            </div>
            <TrendingUp className="text-emerald-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md" onClick={() => setFilters({...filters, stockStatus: 'in'})}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Còn hàng</p>
              <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Package className="text-green-600" size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md" onClick={() => setFilters({...filters, stockStatus: 'low'})}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sắp hết</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-yellow-600" size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md" onClick={() => setFilters({...filters, stockStatus: 'out'})}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Hết hàng</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <TrendingDown className="text-red-600" size={20} />
            </div>
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
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={filters.stockStatus}
            onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="in">Còn hàng (&gt;10)</option>
            <option value="low">Sắp hết (1-10)</option>
            <option value="out">Hết hàng (0)</option>
          </select>
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters({ ...filters, sortBy, sortOrder });
            }}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="quantity-ASC">Tồn kho: Thấp → Cao</option>
            <option value="quantity-DESC">Tồn kho: Cao → Thấp</option>
            <option value="name-ASC">Tên: A-Z</option>
            <option value="price-DESC">Giá: Cao → Thấp</option>
          </select>
          <button
            onClick={() => setFilters({ search: '', categoryId: '', stockStatus: '', page: 1, limit: 20, sortBy: 'quantity', sortOrder: 'ASC' })}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Không tìm thấy sản phẩm nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sản phẩm</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Danh mục</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Giá bán</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Tồn kho</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Giá trị</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map((product) => {
                  const isEditing = editingId === product.id;
                  const stockStatus = product.quantity === 0 
                    ? { label: 'Hết hàng', color: 'bg-red-100 text-red-800' }
                    : product.quantity <= 10 
                    ? { label: 'Sắp hết', color: 'bg-yellow-100 text-yellow-800' }
                    : { label: 'Còn hàng', color: 'bg-green-100 text-green-800' };

                  return (
                    <tr key={product.id} className={`hover:bg-gray-50 ${isEditing ? 'bg-blue-50' : ''}`}>
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
                            <p className="text-xs text-gray-500">SKU: #{product.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.category?.name || '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-blue-500"
                              min="0"
                              autoFocus
                            />
                          ) : (
                            <span className={`px-3 py-1 rounded-lg font-semibold ${
                              product.quantity === 0 ? 'bg-red-100 text-red-800' :
                              product.quantity <= 10 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {product.quantity}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatPrice(product.price * product.quantity)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveStock(product.id)}
                                disabled={updateStockMutation.isLoading}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Lưu"
                              >
                                <Save size={18} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                title="Hủy"
                              >
                                <X size={18} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(product)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Chỉnh sửa tồn kho"
                            >
                              <Edit2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      {stats.lowStock > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
            <div>
              <h4 className="font-semibold text-yellow-800">Cảnh báo tồn kho thấp</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Có {stats.lowStock} sản phẩm sắp hết hàng và {stats.outOfStock} sản phẩm đã hết hàng. 
                Vui lòng kiểm tra và bổ sung hàng kịp thời.
              </p>
              <button
                onClick={() => setFilters({ ...filters, stockStatus: 'low' })}
                className="mt-2 text-sm text-yellow-800 font-medium hover:underline"
              >
                Xem sản phẩm cần nhập →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
