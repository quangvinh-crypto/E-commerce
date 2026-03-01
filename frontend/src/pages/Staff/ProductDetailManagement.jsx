import { useMemo, useState } from 'react';
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

const ProductDetailManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState('');

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

  const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price || 0) + '₫';

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!product) return null;

  const mainImage = selectedImage || images[0];
  const imagePreviewList = images.slice(0, 4);

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
            <p>Giá bán: <span className="font-semibold text-blue-600">{formatPrice(product.price)}</span></p>
            <p>Tồn kho: <span className="font-semibold">{product.quantity || 0}</span></p>
            <p>Trạng thái: <span className="font-semibold">{product.isActive ? 'Đang bán' : 'Ngừng bán'}</span></p>
            <p>Danh mục: <span className="font-semibold">{product.category?.name || 'Chưa phân loại'}</span></p>
            <p className="md:col-span-2">Mã sản phẩm: <span className="font-semibold">{product.id}</span></p>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="border rounded-xl overflow-hidden bg-gray-50 mb-4 flex items-center justify-center">
            <img src={mainImage} alt={product.name} className="w-full max-h-[520px] object-contain" />
          </div>

          <div className="grid grid-cols-4 gap-3">
            {imagePreviewList.map((img, idx) => (
              <button
                key={`${img}-${idx}`}
                onClick={() => setSelectedImage(img)}
                className={`rounded-lg overflow-hidden border-2 ${mainImage === img ? 'border-blue-500' : 'border-gray-200 hover:border-gray-400'}`}
              >
                <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-20 object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-800">Thông số kỹ thuật</h2>
          {Object.keys(specifications).length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(specifications).map(([key, value], idx) => (
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
