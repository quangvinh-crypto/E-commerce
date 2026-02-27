import { useState } from 'react';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CacheManagement = () => {
  const [stats, setStats] = useState(null);

  // Get cache stats
  const getStatsMutation = useMutation(
    () => api.get('/cache/stats'),
    {
      onSuccess: (response) => {
        setStats(response.data.data);
        toast.success('Lấy thông tin cache thành công');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Lấy thông tin cache thất bại');
      },
    }
  );

  // Clear all cache
  const clearAllMutation = useMutation(
    () => api.delete('/cache/all'),
    {
      onSuccess: () => {
        toast.success('Xóa toàn bộ cache thành công');
        setStats(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Xóa cache thất bại');
      },
    }
  );

  // Clear products cache
  const clearProductsMutation = useMutation(
    () => api.delete('/cache/products'),
    {
      onSuccess: () => {
        toast.success('Xóa cache products thành công');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Xóa cache products thất bại');
      },
    }
  );

  // Clear categories cache
  const clearCategoriesMutation = useMutation(
    () => api.delete('/cache/categories'),
    {
      onSuccess: () => {
        toast.success('Xóa cache categories thành công');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Xóa cache categories thất bại');
      },
    }
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản Lý Cache</h1>
        <p className="text-gray-600 mt-2">Xem và xóa cache Redis</p>
      </div>

      {/* Cache Stats */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Thông Tin Cache</h2>
        <button
          onClick={() => getStatsMutation.mutate()}
          disabled={getStatsMutation.isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
        >
          {getStatsMutation.isLoading ? 'Đang tải...' : 'Lấy Thông Tin'}
        </button>

        {stats && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Redis Version:</p>
                <p className="font-semibold">{stats.redis_version || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Connected Clients:</p>
                <p className="font-semibold">{stats.connected_clients || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Used Memory:</p>
                <p className="font-semibold">{stats.used_memory_human || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Keys:</p>
                <p className="font-semibold">{stats.db0?.keys || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clear Cache Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Xóa Cache</h2>
        <div className="space-y-4">
          {/* Clear All */}
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-800">Xóa Toàn Bộ Cache</h3>
              <p className="text-sm text-gray-600">Xóa tất cả cache trong Redis</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn xóa toàn bộ cache?')) {
                  clearAllMutation.mutate();
                }
              }}
              disabled={clearAllMutation.isLoading}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              {clearAllMutation.isLoading ? 'Đang xóa...' : 'Xóa Tất Cả'}
            </button>
          </div>

          {/* Clear Products */}
          <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-800">Xóa Cache Products</h3>
              <p className="text-sm text-gray-600">Xóa cache danh sách sản phẩm</p>
            </div>
            <button
              onClick={() => clearProductsMutation.mutate()}
              disabled={clearProductsMutation.isLoading}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              {clearProductsMutation.isLoading ? 'Đang xóa...' : 'Xóa Products'}
            </button>
          </div>

          {/* Clear Categories */}
          <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-800">Xóa Cache Categories</h3>
              <p className="text-sm text-gray-600">Xóa cache danh mục</p>
            </div>
            <button
              onClick={() => clearCategoriesMutation.mutate()}
              disabled={clearCategoriesMutation.isLoading}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
            >
              {clearCategoriesMutation.isLoading ? 'Đang xóa...' : 'Xóa Categories'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheManagement;
