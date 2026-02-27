import { useState } from 'react';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';

const SearchIndexManagement = () => {
  const [indexStats, setIndexStats] = useState(null);

  // Get index stats
  const getStatsMutation = useMutation(
    () => api.get('/search/health'),
    {
      onSuccess: (response) => {
        setIndexStats(response.data);
        toast.success('Lấy trạng thái search thành công');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Lấy trạng thái search thất bại');
      },
    }
  );

  // Reindex all products
  const reindexMutation = useMutation(
    () => api.post('/search/reindex'),
    {
      onSuccess: (response) => {
        toast.success(`Reindex thành công: ${response.data.indexed || 0} products`);
        getStatsMutation.mutate();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Reindex thất bại');
      },
    }
  );

  // Initialize index
  const initIndexMutation = useMutation(
    () => api.post('/search/init'),
    {
      onSuccess: () => {
        toast.success('Khởi tạo index thành công');
        getStatsMutation.mutate();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Khởi tạo index thất bại');
      },
    }
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản Lý Search Index</h1>
        <p className="text-gray-600 mt-2">Quản lý OpenSearch index cho products</p>
      </div>

      {/* Index Stats */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Thông Tin Index</h2>
        <button
          onClick={() => getStatsMutation.mutate()}
          disabled={getStatsMutation.isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
        >
          {getStatsMutation.isLoading ? 'Đang tải...' : 'Lấy Thông Tin'}
        </button>

        {indexStats && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Trạng thái kết nối:</p>
                <p className="font-semibold">{indexStats.status || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Kết nối OpenSearch:</p>
                <p className={`font-semibold ${indexStats.success ? 'text-green-600' : 'text-red-600'}`}>{indexStats.success ? 'Connected' : 'Disconnected'}</p>
              </div>
              <div>
                <p className="text-gray-600">Thông điệp:</p>
                <p className="font-semibold">{indexStats.message || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Hành động khuyến nghị:</p>
                <p className="font-semibold">{indexStats.success ? 'Reindex khi cần đồng bộ dữ liệu' : 'Kiểm tra cấu hình OpenSearch'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Index Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Thao Tác Index</h2>
        <div className="space-y-4">
          {/* Reindex */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-800">Reindex Products</h3>
              <p className="text-sm text-gray-600">
                Đồng bộ lại toàn bộ products từ database vào OpenSearch
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn reindex toàn bộ products?')) {
                  reindexMutation.mutate();
                }
              }}
              disabled={reindexMutation.isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              {reindexMutation.isLoading ? 'Đang reindex...' : 'Reindex'}
            </button>
          </div>

          {/* Initialize Index */}
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-800">Khởi Tạo Index</h3>
              <p className="text-sm text-gray-600">
                Tạo index products nếu chưa tồn tại
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn khởi tạo index products?')) {
                  initIndexMutation.mutate();
                }
              }}
              disabled={initIndexMutation.isLoading}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              {initIndexMutation.isLoading ? 'Đang khởi tạo...' : 'Khởi Tạo'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Lưu Ý</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Reindex có thể mất vài phút tùy số lượng products</li>
            <li>• Khởi tạo index chỉ cần chạy khi index chưa tồn tại</li>
            <li>• Products mới sẽ tự động được index khi tạo/cập nhật</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SearchIndexManagement;
