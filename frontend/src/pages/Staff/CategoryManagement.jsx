import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  FolderOpen, Plus, Edit2, Trash2, Search, 
  X, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import categoryService from '../../services/categoryService';
import productService from '../../services/productService';

const CategoryManagement = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const { data: categoriesData, isLoading } = useQuery('categories', () =>
    categoryService.getCategories()
  );

  const { data: productsData } = useQuery('all-products', () =>
    productService.getProducts({ limit: 1000 })
  );

  const createMutation = useMutation(
    (data) => categoryService.createCategory(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories');
        toast.success('Tạo danh mục thành công');
        closeModal();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Tạo thất bại');
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }) => categoryService.updateCategory(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories');
        toast.success('Cập nhật thành công');
        closeModal();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Cập nhật thất bại');
      },
    }
  );

  const deleteMutation = useMutation(
    (id) => categoryService.deleteCategory(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories');
        toast.success('Xóa thành công');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Xóa thất bại. Có thể danh mục đang có sản phẩm.');
      },
    }
  );

  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Tên danh mục không được để trống');
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (category) => {
    const productCount = getProductCount(category.id);
    if (productCount > 0) {
      toast.error(`Không thể xóa. Danh mục đang có ${productCount} sản phẩm.`);
      return;
    }
    if (window.confirm(`Xóa danh mục "${category.name}"?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const getProductCount = (categoryId) => {
    return (productsData?.data || []).filter(p => p.categoryId === categoryId).length;
  };

  const categories = categoriesData?.data || [];
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProducts = productsData?.data?.length || 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản Lý Danh Mục</h1>
          <p className="text-gray-600 mt-1">{categories.length} danh mục, {totalProducts} sản phẩm</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg"
        >
          <Plus size={18} /> Thêm danh mục
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg shadow">
          <FolderOpen size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {searchTerm ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục nào'}
          </p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg"
          >
            <Plus size={18} /> Tạo danh mục đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCategories.map((category) => {
            const productCount = getProductCount(category.id);
            return (
              <div
                key={category.id}
                className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden group"
              >
                {/* Category Image */}
                <div className="relative h-40 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FolderOpen size={48} className="text-blue-300" />
                  </div>
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                    {productCount} sản phẩm
                  </div>
                </div>

                {/* Category Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 mb-1">{category.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                    {category.description || 'Không có mô tả'}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(category)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm"
                    >
                      <Edit2 size={16} /> Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      disabled={productCount > 0}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg font-medium text-sm ${
                        productCount > 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                      title={productCount > 0 ? 'Không thể xóa danh mục có sản phẩm' : 'Xóa danh mục'}
                    >
                      <Trash2 size={16} /> Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Điện thoại, Laptop, Phụ kiện..."
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Mô tả ngắn về danh mục..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
                >
                  <Save size={18} />
                  {editingCategory ? 'Cập nhật' : 'Tạo mới'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
