import { useEffect, useState, useCallback } from 'react';
import { EyeOff, Eye, RefreshCw, Search, MessageSquare, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import reviewService from '../../services/reviewService';

const ReviewManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    isVisible: '',
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        isVisible: filters.isVisible === '' ? undefined : filters.isVisible,
      };
      const res = await reviewService.getModerationReviews(params);
      setReviews(res.data || []);
      setPagination(res.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tải danh sách bình luận');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleVisibility = async (reviewId, nextVisibility) => {
    try {
      await reviewService.setReviewVisibility(reviewId, nextVisibility);
      toast.success(nextVisibility ? 'Đã hiển thị lại bình luận' : 'Đã ẩn bình luận');
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái hiển thị');
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
      await reviewService.deleteReview(reviewId);
      toast.success('Đã xóa bình luận');
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xóa bình luận');
    }
  };

  const formatDate = (dateValue) => {
    return new Date(dateValue).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản lý bình luận</h1>
          <p className="text-gray-600 mt-1">Duyệt, ẩn/hiện và xử lý bình luận sản phẩm</p>
        </div>
        <button
          onClick={fetchReviews}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
              placeholder="Tìm theo nội dung bình luận"
              className="w-full border rounded-lg pl-9 pr-3 py-2"
            />
          </div>
          <select
            value={filters.isVisible}
            onChange={(e) => setFilters((prev) => ({ ...prev, isVisible: e.target.value, page: 1 }))}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hiển thị</option>
            <option value="false">Đã ẩn</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MessageSquare size={52} className="mx-auto mb-3 text-gray-300" />
            Không có bình luận phù hợp
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sản phẩm</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Người viết</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nội dung</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Đánh giá</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Thời gian</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 line-clamp-1">{review.productId?.name || 'N/A'}</p>
                      {review.parentId && <p className="text-xs text-indigo-600">Phản hồi bình luận</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{review.user?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{review.user?.email || ''}</p>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <p className="text-sm text-gray-700 line-clamp-2">{review.comment}</p>
                      <span className={`inline-flex mt-1 text-xs px-2 py-1 rounded-full ${review.isVisible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {review.isVisible ? 'Hiển thị' : 'Đã ẩn'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {review.rating ? `${review.rating}/5` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(review.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleVisibility(review.id, !review.isVisible)}
                          className={`p-2 rounded-lg ${review.isVisible ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={review.isVisible ? 'Ẩn bình luận' : 'Hiện bình luận'}
                        >
                          {review.isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                          title="Xóa bình luận"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={filters.page <= 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Trước
          </button>
          <span className="px-2 text-gray-600">Trang {pagination.page} / {pagination.totalPages}</span>
          <button
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={filters.page >= pagination.totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewManagement;
