import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import { useAuth } from '../../contexts/AuthContext';

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

const defaultVariantColors = [
  { name: 'Cam', hex: '#f59e0b' },
  { name: 'Trang', hex: '#f8fafc' },
];

const defaultVariantStorages = ['256GB', '512GB', '1TB'];

const defaultSpecKeys = defaultSpecFields.map((f) => f.key);

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
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
  const [existingImages, setExistingImages] = useState([]);
  const [primaryImage, setPrimaryImage] = useState(null);
  const [detailImages, setDetailImages] = useState([]);
  const [variantColors, setVariantColors] = useState(defaultVariantColors);
  const [variantStorages, setVariantStorages] = useState(defaultVariantStorages);
  const [variants, setVariants] = useState([]);
  const managementBasePath = user?.role === 'admin' ? '/admin' : '/staff';

  const { data: productData, isLoading: isLoadingProduct } = useQuery(
    ['product', id],
    () => productService.getProductById(id),
    {
      refetchOnMount: 'always',
      onError: () => {
        toast.error('Không tìm thấy product');
        navigate(`${managementBasePath}/products`);
      },
    }
  );

  useEffect(() => {
    if (!productData) return;

    const product = productData.data;

    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      quantity: product.quantity || '',
      categoryId: product.categoryId || '',
      isActive: product.isActive ?? true,
    });

    let specs = {};
    if (product.specifications) {
      if (typeof product.specifications === 'string') {
        try {
          const parsed = JSON.parse(product.specifications);
          specs = parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
          specs = {};
        }
      } else if (typeof product.specifications === 'object') {
        specs = product.specifications;
      }
    }

    let parsedVariantColors = defaultVariantColors;
    let parsedVariantStorages = defaultVariantStorages;

    if (typeof specs.variantColors === 'string') {
      try {
        const nextColors = JSON.parse(specs.variantColors);
        if (Array.isArray(nextColors) && nextColors.length > 0) {
          parsedVariantColors = nextColors
            .map((item) => ({
              name: String(item?.name || '').trim(),
              hex: String(item?.hex || '').trim(),
            }))
            .filter((item) => item.name && item.hex);
        }
      } catch (_) {
        parsedVariantColors = defaultVariantColors;
      }
    }

    if (typeof specs.variantStorages === 'string') {
      try {
        const nextStorages = JSON.parse(specs.variantStorages);
        if (Array.isArray(nextStorages) && nextStorages.length > 0) {
          parsedVariantStorages = nextStorages
            .map((value) => String(value || '').trim())
            .filter(Boolean);
        }
      } catch (_) {
        parsedVariantStorages = defaultVariantStorages;
      }
    }

    delete specs.variantColors;
    delete specs.variantStorages;

    const defaultSpecs = {};
    const customSpecsList = [];

    Object.entries(specs).forEach(([key, value]) => {
      if (defaultSpecKeys.includes(key)) {
        defaultSpecs[key] = value;
      } else {
        customSpecsList.push({ key, value });
      }
    });

    setSpecifications(defaultSpecs);
    setCustomSpecs(customSpecsList);
    setShowAllSpecs(Object.keys(specs).length > 8);
    setVariantColors(parsedVariantColors.length > 0 ? parsedVariantColors : defaultVariantColors);
    setVariantStorages(parsedVariantStorages.length > 0 ? parsedVariantStorages : defaultVariantStorages);
    const productVariants = Array.isArray(product.variants)
      ? product.variants.map((variant) => ({
          id: variant.id || variant._id,
          color: variant.color || '',
          colorHex: variant.colorHex || '#737373',
          storage: variant.storage || '',
          price: variant.price ?? '',
          quantity: variant.quantity ?? '',
        }))
      : [];
    setVariants(productVariants);
    setExistingImages(Array.isArray(product.images) ? product.images : []);
    setPrimaryImage(null);
    setDetailImages([]);
  }, [productData]);

  const { data: categoriesData } = useQuery('categories', () => categoryService.getCategories());

  const updateProductMutation = useMutation(
    (productData) => productService.updateProduct(id, productData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        queryClient.invalidateQueries(['product', id]);
        toast.success('Cập nhật product thành công');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Cập nhật product thất bại');
      },
    }
  );

  const deleteImageMutation = useMutation(
    ({ productId, publicId }) => productService.deleteProductImage(productId, publicId),
    {
      onSuccess: (response) => {
        const images = Array.isArray(response?.data?.images) ? response.data.images : [];
        setExistingImages(images);
        queryClient.invalidateQueries('products');
        queryClient.invalidateQueries(['product', id]);
        toast.success('Xóa ảnh thành công');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Xóa ảnh thất bại');
      },
    }
  );

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Tên sản phẩm không được để trống';
    if (!formData.price || formData.price <= 0) newErrors.price = 'Giá phải lớn hơn 0';
    if (formData.quantity < 0) newErrors.quantity = 'Số lượng không được âm';
    if (!variants.length) newErrors.variants = 'Vui lòng tạo ít nhất 1 biến thể màu/dung lượng';
    if (variants.some((variant) => !variant.color || !variant.storage || Number(variant.price) <= 0 || Number(variant.quantity) < 0)) {
      newErrors.variants = 'Biến thể phải có màu, dung lượng, giá > 0 và tồn kho >= 0';
    }
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

    const sanitizedColors = variantColors
      .map((item) => ({
        name: String(item.name || '').trim(),
        hex: String(item.hex || '').trim(),
      }))
      .filter((item) => item.name && item.hex);

    const sanitizedStorages = variantStorages
      .map((item) => String(item || '').trim())
      .filter(Boolean);

    if (sanitizedColors.length > 0) {
      allSpecs.variantColors = JSON.stringify(sanitizedColors);
    }

    if (sanitizedStorages.length > 0) {
      allSpecs.variantStorages = JSON.stringify(sanitizedStorages);
    }

    const filteredSpecs = Object.fromEntries(
      Object.entries(allSpecs).filter(([_, v]) => {
        if (v === undefined || v === null) return false;
        return String(v).trim() !== '';
      })
    );

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity) || 0,
      categoryId: formData.categoryId || null,
      specifications: Object.keys(filteredSpecs).length > 0 ? filteredSpecs : null,
      variants: variants.map((variant) => ({
        id: variant.id,
        color: variant.color,
        colorHex: variant.colorHex,
        storage: variant.storage,
        price: Number(variant.price) || 0,
        quantity: Number(variant.quantity) || 0,
      })),
      primaryImage,
      detailImages,
    };

    updateProductMutation.mutate(productData);
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

  const addVariantColor = () => {
    setVariantColors((prev) => [...prev, { name: '', hex: '#000000' }]);
  };

  const updateVariantColor = (index, field, value) => {
    setVariantColors((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const removeVariantColor = (index) => {
    setVariantColors((prev) => prev.filter((_, i) => i !== index));
  };

  const addVariantStorage = () => {
    setVariantStorages((prev) => [...prev, '']);
  };

  const updateVariantStorage = (index, value) => {
    setVariantStorages((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const removeVariantStorage = (index) => {
    setVariantStorages((prev) => prev.filter((_, i) => i !== index));
  };

  const buildVariantsFromOptions = () => {
    const colors = variantColors
      .map((item) => ({ name: String(item.name || '').trim(), hex: String(item.hex || '').trim() }))
      .filter((item) => item.name && item.hex);
    const storages = variantStorages.map((item) => String(item || '').trim()).filter(Boolean);

    const generated = colors.flatMap((color) =>
      storages.map((storage) => {
        const existing = variants.find((variant) => variant.color === color.name && variant.storage === storage);
        return {
          id: existing?.id,
          color: color.name,
          colorHex: color.hex,
          storage,
          price: existing?.price || formData.price || '',
          quantity: existing?.quantity || '',
        };
      })
    );

    setVariants(generated);
    if (generated.length > 0 && errors.variants) {
      setErrors((prev) => ({ ...prev, variants: '' }));
    }
  };

  const updateVariant = (index, field, value) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const removeVariant = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePrimaryImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPrimaryImage(file);
  };

  const handleDetailImagesChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    setDetailImages(files);
  };

  const handleDeleteExistingImage = (publicId) => {
    if (!publicId) return;
    deleteImageMutation.mutate({ productId: id, publicId });
  };

  const categories = categoriesData?.data || [];
  const visibleSpecs = showAllSpecs ? defaultSpecFields : defaultSpecFields.slice(0, 8);

  if (isLoadingProduct || !productData) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Chỉnh Sửa Product</h1>
        <p className="text-gray-600 mt-2">Cập nhật thông tin sản phẩm #{id}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-7">
          <form onSubmit={handleSubmit}>
            <div className="border border-gray-200 rounded-xl p-4 md:p-5 mb-6 bg-gray-50/40">
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
            <div className="mb-0">
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
            </div>

            {/* Product Images */}
            <div className="border border-gray-200 rounded-xl p-4 md:p-5 mb-6 bg-gray-50/40">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Hình ảnh sản phẩm</h2>

              {existingImages.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Ảnh hiện tại</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {existingImages.map((img, idx) => (
                      <div key={img.publicId || `${img.url}-${idx}`} className="relative border rounded-lg overflow-hidden">
                        <img src={img.url} alt={`Ảnh ${idx + 1}`} className="w-full h-24 object-cover" />
                        {img.publicId && (
                          <button
                            type="button"
                            onClick={() => handleDeleteExistingImage(img.publicId)}
                            disabled={deleteImageMutation.isLoading}
                            className="absolute top-1 right-1 p-1.5 bg-white/90 text-red-500 rounded hover:bg-white disabled:opacity-50"
                            title="Xóa ảnh"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Thêm ảnh đại diện mới</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePrimaryImageChange}
                  className="w-full border rounded-lg px-4 py-2 bg-white"
                />
                {primaryImage && (
                  <img
                    src={URL.createObjectURL(primaryImage)}
                    alt="Ảnh đại diện mới"
                    className="mt-3 w-32 h-32 object-cover rounded-lg border"
                  />
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Thêm ảnh chi tiết mới (tối đa 3 ảnh)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleDetailImagesChange}
                  className="w-full border rounded-lg px-4 py-2 bg-white"
                />
                {detailImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {detailImages.map((file, idx) => (
                      <img
                        key={`${file.name}-${idx}`}
                        src={URL.createObjectURL(file)}
                        alt={`Ảnh mới ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-4 md:p-5 mb-6 bg-gray-50/40">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Tuy chon bien the (preview)</h2>

              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-700 mb-2">Bang mau theo dong may</p>
                <div className="space-y-2">
                  {variantColors.map((color, idx) => (
                    <div key={`color-${idx}`} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={color.name}
                        onChange={(e) => updateVariantColor(idx, 'name', e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        placeholder="Ten mau (vd: Cam titan)"
                      />
                      <input
                        type="color"
                        value={color.hex || '#000000'}
                        onChange={(e) => updateVariantColor(idx, 'hex', e.target.value)}
                        className="w-12 h-10 border rounded-lg p-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeVariantColor(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addVariantColor}
                  className="mt-3 flex items-center gap-1 text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  <Plus size={16} /> Them mau
                </button>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Dung luong theo dong may</p>
                <div className="space-y-2">
                  {variantStorages.map((storage, idx) => (
                    <div key={`storage-${idx}`} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={storage}
                        onChange={(e) => updateVariantStorage(idx, e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        placeholder="VD: 256GB, 512GB, 1TB"
                      />
                      <button
                        type="button"
                        onClick={() => removeVariantStorage(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addVariantStorage}
                  className="mt-3 flex items-center gap-1 text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  <Plus size={16} /> Them dung luong
                </button>
              </div>

              <div className="mt-5 pt-4 border-t">
                <button
                  type="button"
                  onClick={buildVariantsFromOptions}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600"
                >
                  Tao bang bien the
                </button>

                {variants.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {variants.map((variant, idx) => (
                      <div key={`${variant.color}-${variant.storage}-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border">
                        <div className="md:col-span-3 flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: variant.colorHex }}></span>
                          <span>{variant.color}</span>
                        </div>
                        <div className="md:col-span-3 text-sm text-gray-700">{variant.storage}</div>
                        <input
                          type="number"
                          min="0"
                          value={variant.price}
                          onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                          className="md:col-span-2 border rounded-lg px-2 py-1 text-sm"
                          placeholder="Gia"
                        />
                        <input
                          type="number"
                          min="0"
                          value={variant.quantity}
                          onChange={(e) => updateVariant(idx, 'quantity', e.target.value)}
                          className="md:col-span-2 border rounded-lg px-2 py-1 text-sm"
                          placeholder="Ton kho"
                        />
                        <button
                          type="button"
                          onClick={() => removeVariant(idx)}
                          className="md:col-span-2 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {errors.variants && <p className="text-red-500 text-sm mt-2">{errors.variants}</p>}
              </div>
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
            <div className="border border-gray-200 rounded-xl p-4 md:p-5">
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
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                type="submit"
                disabled={updateProductMutation.isLoading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50"
              >
                {updateProductMutation.isLoading ? 'Đang cập nhật...' : 'Cập Nhật'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`${managementBasePath}/products`)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>

        {/* Preview Sidebar */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6 sticky top-6">
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

export default EditProduct;
