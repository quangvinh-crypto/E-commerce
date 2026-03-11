import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import productService from '../../services/productService';
import { getImageUrl } from '../../utils/imageHelper';
import { useAuth } from '../../contexts/AuthContext';

const specLabels = {
  brand: 'Thương hiệu',
  screen: 'Màn hình',
  os: 'Hệ điều hành',
  cpu: 'CPU',
  ram: 'RAM',
  storage: 'Bộ nhớ trong',
  camera: 'Camera sau',
  frontCamera: 'Camera trước',
  battery: 'Pin',
  charging: 'Sạc',
  sim: 'SIM',
  connectivity: 'Kết nối',
  weight: 'Trọng lượng',
  dimensions: 'Kích thước',
  material: 'Chất liệu',
  waterproof: 'Chống nước',
  color: 'Màu sắc',
  warranty: 'Bảo hành',
};

const INTERNAL_SPEC_KEYS = new Set(['variantColors', 'variantStorages']);

const ProductDetailManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');

  const managementBasePath = user?.role === 'admin' ? '/admin' : '/staff';

  const { data, isLoading } = useQuery(
    ['product-management-detail', id],
    () => productService.getProductById(id),
    {
      onError: () => {
        toast.error('Không thể tải chi tiết sản phẩm');
        navigate(`${managementBasePath}/products`);
      },
      onSuccess: (response) => {
        const product = response?.data;
        const images =
          product?.images?.length > 0
            ? product.images.map((img) => getImageUrl(img))
            : product?.image_url
            ? [getImageUrl(product.image_url)]
            : ['https://via.placeholder.com/800?text=No+Image'];
        setSelectedImage(images[0]);
        const variants = Array.isArray(product?.variants)
          ? product.variants.filter((variant) => variant?.isActive !== false)
          : [];
        if (variants.length > 0) {
          const first = variants[0];
          setSelectedColor(first.color || '');
          setSelectedStorage(first.storage || '');
        }
      },
    }
  );

  const product = data?.data;

  const images = useMemo(() => {
    if (!product) return ['https://via.placeholder.com/800?text=No+Image'];
    if (product.images?.length > 0) {
      return product.images.map((img) => getImageUrl(img));
    }
    if (product.image_url) {
      return [getImageUrl(product.image_url)];
    }
    return ['https://via.placeholder.com/800?text=No+Image'];
  }, [product]);

  const specifications = useMemo(() => {
    if (!product?.specifications) return {};
    if (typeof product.specifications === 'string') {
      try {
        return JSON.parse(product.specifications);
      } catch (_) {
        return {};
      }
    }
    return product.specifications;
  }, [product]);

  const filteredSpecifications = useMemo(
    () => Object.fromEntries(Object.entries(specifications).filter(([key]) => !INTERNAL_SPEC_KEYS.has(key))),
    [specifications]
  );

  const variants = useMemo(() => {
    if (!Array.isArray(product?.variants)) return [];
    return product.variants
      .filter((variant) => variant?.isActive !== false)
      .map((variant) => ({
        id: variant.id || variant._id,
        color: variant.color,
        colorHex: variant.colorHex || '#737373',
        storage: variant.storage,
        price: Number(variant.price) || 0,
        quantity: Number(variant.quantity) || 0,
        images: Array.isArray(variant.images) ? variant.images.map((img) => getImageUrl(img)) : [],
      }));
  }, [product]);

  const colorOptions = useMemo(
    () => [...new Set(variants.map((variant) => variant.color).filter(Boolean))],
    [variants]
  );

  const storageOptions = useMemo(() => {
    if (!selectedColor) return [];
    return variants
      .filter((variant) => variant.color === selectedColor)
      .map((variant) => variant.storage)
      .filter(Boolean);
  }, [variants, selectedColor]);

  const selectedVariant = useMemo(
    () =>
      variants.find(
        (variant) => variant.color === selectedColor && variant.storage === selectedStorage
      ) || variants.find((variant) => variant.color === selectedColor) || null,
    [variants, selectedColor, selectedStorage]
  );

  const colorThumbnails = useMemo(() => {
    const seen = new Set();
    return variants
      .filter((variant) => {
        if (!variant?.color || seen.has(variant.color)) return false;
        seen.add(variant.color);
        return true;
      })
      .map((variant) => ({
        color: variant.color,
        image: (Array.isArray(variant.images) && variant.images[0]) || images[0],
      }));
  }, [variants, images]);

  const handleSelectColor = (color) => {
    if (!color) return;
    setSelectedColor(color);
    const matched =
      variants.find((variant) => variant.color === color && variant.storage === selectedStorage) ||
      variants.find((variant) => variant.color === color) ||
      null;
    if (matched?.storage) setSelectedStorage(matched.storage);
    const representative = (Array.isArray(matched?.images) && matched.images[0]) || '';
    setSelectedImage(representative || '');
  };

  useEffect(() => {
    if (!selectedColor && colorOptions.length > 0) {
      setSelectedColor(colorOptions[0]);
    }
  }, [selectedColor, colorOptions]);

  useEffect(() => {
    if (selectedColor && storageOptions.length > 0 && !storageOptions.includes(selectedStorage)) {
      setSelectedStorage(storageOptions[0]);
    }
  }, [selectedColor, selectedStorage, storageOptions]);

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price || 0) + '₫';

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!product) return null;

  const activeImages = selectedVariant?.images?.length > 0 ? selectedVariant.images : images;
  const mainImage = activeImages.includes(selectedImage) ? selectedImage : activeImages[0];
  const displayPrice = selectedVariant?.price || product.price;
  const displayStock = selectedVariant?.quantity ?? (product.quantity || 0);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link
            to={`${managementBasePath}/products`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft size={16} />
            Quay lại danh sách sản phẩm
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{product.name}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
              <BadgeCheck size={14} />
              {product.isActive ? 'Đang bán' : 'Ngừng bán'}
            </span>
            <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
              {product.category?.name || 'Chưa phân loại'}
            </span>
          </div>
        </div>
        <Link
          to={`${managementBasePath}/products/${product.id}/edit`}
          className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg"
        >
          <Edit2 size={16} />
          Chỉnh sửa
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-3">Thông tin sản phẩm</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
            <p>Giá bán: <span className="font-semibold text-blue-600">{formatPrice(displayPrice)}</span></p>
            <p>Tồn kho: <span className="font-semibold">{displayStock}</span></p>
            <p>Trạng thái: <span className="font-semibold">{product.isActive ? 'Đang bán' : 'Ngừng bán'}</span></p>
            <p>Danh mục: <span className="font-semibold">{product.category?.name || 'Chưa phân loại'}</span></p>
            <p className="md:col-span-2">Mã sản phẩm: <span className="font-semibold">{product.id}</span></p>
            {selectedVariant && (
              <p className="md:col-span-2">Biến thể: <span className="font-semibold">{selectedVariant.color} / {selectedVariant.storage}</span></p>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {colorOptions.length > 0 && (
            <div className="mb-4 p-3 border rounded-xl bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">Chọn màu</p>
              <div className="flex gap-2 flex-wrap mb-3">
                {colorOptions.map((color) => {
                  const colorHex = variants.find((variant) => variant.color === color)?.colorHex || '#737373';
                  return (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      onClick={() => handleSelectColor(color)}
                      className={`w-9 h-9 rounded-full border-2 ${selectedColor === color ? 'border-blue-500' : 'border-gray-300'}`}
                      style={{ backgroundColor: colorHex }}
                    />
                  );
                })}
              </div>
              {storageOptions.length > 0 && (
                <>
                  <p className="text-sm text-gray-600 mb-2">Chọn dung lượng</p>
                  <div className="flex gap-2 flex-wrap">
                    {storageOptions.map((storage) => (
                      <button
                        key={storage}
                        type="button"
                        onClick={() => {
                          setSelectedStorage(storage);
                          setSelectedImage('');
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-sm ${selectedStorage === storage ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-700'}`}
                      >
                        {storage}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="border rounded-xl overflow-hidden bg-gray-50 mb-4 flex items-center justify-center">
            <img src={mainImage} alt={product.name} className="w-full max-h-[520px] object-contain" />
          </div>

          {colorThumbnails.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mt-3">
              {colorThumbnails.map((item) => (
                <button
                  key={item.color}
                  type="button"
                  onClick={() => handleSelectColor(item.color)}
                  className={`rounded-lg overflow-hidden border-2 ${selectedColor === item.color ? 'border-blue-500' : 'border-gray-200 hover:border-gray-400'}`}
                  title={item.color}
                >
                  <img src={item.image} alt={item.color} className="w-full h-16 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Thông số kỹ thuật</h2>
          {Object.keys(filteredSpecifications).length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(filteredSpecifications).map(([key, value], idx) => (
                    <tr key={key} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-3 py-2 text-gray-600 font-medium w-2/5">{specLabels[key] || key}</td>
                      <td className="px-3 py-2 text-gray-800">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">Chưa có thông số kỹ thuật</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-3">Mô tả sản phẩm</h2>
        <p className="text-gray-700 whitespace-pre-line">{product.description || 'Chưa có mô tả'}</p>
      </div>
    </div>
  );
};

export default ProductDetailManagement;
