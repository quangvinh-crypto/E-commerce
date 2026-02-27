import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';

const defaultSpecFields = [
  { key: 'brand', label: 'Thương hiệu', placeholder: 'Apple, Samsung, Xiaomi...' },
  { key: 'screen', label: 'Màn hình', placeholder: '6.7 inch, AMOLED, 120Hz...' },
  { key: 'os', label: 'Hệ điều hành', placeholder: 'iOS 17, Android 14...' },
  { key: 'cpu', label: 'CPU', placeholder: 'A17 Pro, Snapdragon 8 Gen 3...' },
  { key: 'ram', label: 'RAM', placeholder: '8GB, 12GB...' },
  { key: 'storage', label: 'Bộ nhớ trong', placeholder: '128GB, 256GB, 512GB...' },
  { key: 'camera', label: 'Camera sau', placeholder: '48MP + 12MP + 12MP...' },
  { key: 'frontCamera', label: 'Camera trước', placeholder: '12MP...' },
  { key: 'battery', label: 'Pin', placeholder: '4500mAh, 5000mAh...' },
  { key: 'charging', label: 'Sạc', placeholder: 'Sạc nhanh 67W, Sạc không dây...' },
  { key: 'sim', label: 'SIM', placeholder: '2 Nano SIM, eSIM...' },
  { key: 'connectivity', label: 'Kết nối', placeholder: '5G, WiFi 6E, Bluetooth 5.3...' },
  { key: 'weight', label: 'Trọng lượng', placeholder: '187g, 221g...' },
  { key: 'dimensions', label: 'Kích thước', placeholder: '160.7 x 77.6 x 7.85 mm' },
  { key: 'material', label: 'Chất liệu', placeholder: 'Khung nhôm, Mặt lưng kính...' },
  { key: 'waterproof', label: 'Chống nước', placeholder: 'IP68, IP67...' },
  { key: 'color', label: 'Màu sắc', placeholder: 'Đen, Trắng, Xanh...' },
  { key: 'warranty', label: 'Bảo hành', placeholder: '12 tháng, 24 tháng...' },
];

const CreateProduct = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    categoryId: '',
    isActive: true,
  });
  const [specifications, setSpecifications] = useState({});
  const [customSpecs, setCustomSpecs] = useState([]);
  const [errors, setErrors] = useState({});
  const [showAllSpecs, setShowAllSpecs] = useState(false);

  const { data: categoriesData } = useQuery('categories', () => categoryService.getCategories());

  const createProductMutation = useMutation(
    (productData) => productService.createProduct(productData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        toast.success('Tạo product thành công');
        navigate('/staff/products');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Tạo product thất bại');
      },
    }
  );

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Tên sản phẩm không được để trống';
    if (!formData.price || formData.price <= 0) newErrors.price = 'Giá phải lớn hơn 0';
    if (formData.quantity < 0) newErrors.quantity = 'Số lượng không được âm';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const allSpecs = { ...specifications };
    customSpecs.forEach((spec) => {
      if (spec.key && spec.value) {
        allSpecs[spec.key] = spec.value;
      }
    });

    const filteredSpecs = Object.fromEntries(
      Object.entries(allSpecs).filter(([_, v]) => v && v.trim())
    );

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity) || 0,
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
      specifications: Object.keys(filteredSpecs).length > 0 ? filteredSpecs : null,
    };

    createProductMutation.mutate(productData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSpecChange = (key, value) => {
    setSpecifications((prev) => ({ ...prev, [key]: value }));
  };

  const addCustomSpec = () => {
    setCustomSpecs((prev) => [...prev, { key: '', value: '' }]);
  };

  const updateCustomSpec = (index, field, value) => {
    setCustomSpecs((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const removeCustomSpec = (index) => {
    setCustomSpecs((prev) => prev.filter((_, i) => i !== index));
  };

  const categories = categoriesData?.data || [];
  const visibleSpecs = showAllSpecs ? defaultSpecFields : defaultSpecFields.slice(0, 8);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Tạo Product Mới</h1>
        <p className="text-gray-600 mt-2">Thêm sản phẩm mới vào hệ thống</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Thông tin cơ bản</h2>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Tên sản phẩm <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : ''
                }`}
                placeholder="iPhone 15 Pro Max 256GB"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Mô tả</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mô tả chi tiết sản phẩm..."
              />
            </div>

            {/* Price & Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Giá (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.price ? 'border-red-500' : ''
                  }`}
                  placeholder="29990000"
                  min="0"
                  step="1000"
                />
                {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Số lượng</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.quantity ? 'border-red-500' : ''
                  }`}
                  placeholder="100"
                  min="0"
                />
                {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
              </div>
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Danh mục</label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Is Active */}
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4"
                />
                <span className="text-gray-700 font-semibold">Kích hoạt sản phẩm</span>
              </label>
            </div>

            {/* Specifications Section */}
            <div className="border-t pt-6 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Thông số kỹ thuật</h2>
                <div className="group relative">
                  <Info size={18} className="text-gray-400 cursor-help" />
                  <div className="absolute left-0 top-6 w-64 p-2 bg-gray-800 text-white text-xs rounded hidden group-hover:block z-10">
                    Điền các thông số kỹ thuật của sản phẩm như RAM, ROM, pin, màn hình...
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleSpecs.map((spec) => (
                  <div key={spec.key}>
                    <label className="block text-gray-600 text-sm mb-1">{spec.label}</label>
                    <input
                      type="text"
                      value={specifications[spec.key] || ''}
                      onChange={(e) => handleSpecChange(spec.key, e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={spec.placeholder}
                    />
                  </div>
                ))}
              </div>

              {!showAllSpecs && (
                <button
                  type="button"
                  onClick={() => setShowAllSpecs(true)}
                  className="mt-4 text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  + Hiện thêm {defaultSpecFields.length - 8} thông số
                </button>
              )}

              {/* Custom Specifications */}
              {customSpecs.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Thông số tùy chỉnh</h3>
                  {customSpecs.map((spec, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={spec.key}
                        onChange={(e) => updateCustomSpec(idx, 'key', e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        placeholder="Tên thông số"
                      />
                      <input
                        type="text"
                        value={spec.value}
                        onChange={(e) => updateCustomSpec(idx, 'value', e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        placeholder="Giá trị"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomSpec(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={addCustomSpec}
                className="mt-4 flex items-center gap-1 text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                <Plus size={16} /> Thêm thông số tùy chỉnh
              </button>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 mt-8">
              <button
                type="submit"
                disabled={createProductMutation.isLoading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50"
              >
                {createProductMutation.isLoading ? 'Đang tạo...' : 'Tạo Product'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/staff/products')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>

        {/* Preview Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Xem trước thông số</h3>
            {Object.keys(specifications).filter((k) => specifications[k]).length > 0 ||
            customSpecs.some((s) => s.key && s.value) ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {defaultSpecFields
                      .filter((spec) => specifications[spec.key])
                      .map((spec, idx) => (
                        <tr key={spec.key} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-3 py-2 font-medium text-gray-600 w-1/2">{spec.label}</td>
                          <td className="px-3 py-2 text-gray-800">{specifications[spec.key]}</td>
                        </tr>
                      ))}
                    {customSpecs
                      .filter((s) => s.key && s.value)
                      .map((spec, idx) => (
                        <tr
                          key={`custom-${idx}`}
                          className={
                            (Object.keys(specifications).filter((k) => specifications[k]).length + idx) % 2 === 0
                              ? 'bg-gray-50'
                              : 'bg-white'
                          }
                        >
                          <td className="px-3 py-2 font-medium text-gray-600 w-1/2">{spec.key}</td>
                          <td className="px-3 py-2 text-gray-800">{spec.value}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Chưa có thông số nào được nhập</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProduct;
