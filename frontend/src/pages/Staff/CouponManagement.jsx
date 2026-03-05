import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { BadgePercent, Calendar, Edit2, Search, Ticket, Trash2, UserCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import couponService from '../../services/couponService';

const defaultFormData = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  maxDiscountAmount: '',
  minOrderAmount: '',
  startsAt: '',
  expiresAt: '',
  usageLimit: '',
  perUserLimit: '1',
  isActive: false,
};

const toInputDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const toOptionalNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const CouponManagement = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    ...defaultFormData,
    startsAt: toInputDateTime(new Date()),
  });
  const [editingCouponId, setEditingCouponId] = useState(null);

  const { data, isLoading } = useQuery('coupons-management', () =>
    couponService.getCoupons({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'DESC' })
  );

  const refreshCoupons = () => queryClient.invalidateQueries('coupons-management');

  const createMutation = useMutation((payload) => couponService.createCoupon(payload), {
    onSuccess: () => {
      toast.success('Tao coupon thanh cong');
      refreshCoupons();
      setFormData({ ...defaultFormData, startsAt: toInputDateTime(new Date()) });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Tạo coupon thất bại');
    },
  });

  const updateMutation = useMutation(({ id, payload }) => couponService.updateCoupon(id, payload), {
    onSuccess: () => {
      toast.success('cập nhật coupon thành công');
      refreshCoupons();
      resetForm();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Cập nhật coupon thất bại');
    },
  });

  const toggleStatusMutation = useMutation(({ id, isActive }) => couponService.updateCoupon(id, { isActive }), {
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái coupon');
      refreshCoupons();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật trạng thái');
    },
  });

  const deleteMutation = useMutation((id) => couponService.deleteCoupon(id), {
    onSuccess: () => {
      toast.success('Xoa coupon thanh cong');
      refreshCoupons();
      if (editingCouponId) {
        resetForm();
      }
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Khong the xoa coupon');
    },
  });

  const filteredCoupons = useMemo(() => {
    const coupons = data?.data || [];
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return coupons;
    return coupons.filter((coupon) => String(coupon.code || '').toLowerCase().includes(keyword));
  }, [data?.data, searchTerm]);

  const isSubmitting = createMutation.isLoading || updateMutation.isLoading;

  const resetForm = () => {
    setEditingCouponId(null);
    setFormData({ ...defaultFormData, startsAt: toInputDateTime(new Date()) });
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const buildPayload = () => {
    const code = String(formData.code || '').trim().toUpperCase();
    if (code.length < 3 || code.length > 30) {
      toast.error('Mã coupon phải từ 3 đến 30 ký tự');
      return null;
    }

    const discountValue = Number(formData.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      toast.error('Giá trị giảm phải lớn hơn 0');
      return null;
    }

    if (formData.discountType === 'percentage' && discountValue > 100) {
      toast.error('Phần trăm giảm không được vượt quá 100%');
      return null;
    }

    const startsAt = formData.startsAt ? new Date(formData.startsAt) : new Date();
    const expiresAt = new Date(formData.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      toast.error('Vui lòng chọn thời gian hết hạn');
      return null;
    }

    if (expiresAt <= startsAt) {
      toast.error('Thời gian hết hạn phải lớn hơn thời gian bắt đầu');
      return null;
    }

    const payload = {
      code,
      discountType: formData.discountType,
      discountValue,
      minOrderAmount: toOptionalNumber(formData.minOrderAmount),
      usageLimit: toOptionalNumber(formData.usageLimit),
      perUserLimit: toOptionalNumber(formData.perUserLimit),
      startsAt: startsAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: Boolean(formData.isActive),
    };

    if (formData.discountType === 'percentage') {
      payload.maxDiscountAmount = toOptionalNumber(formData.maxDiscountAmount);
    }

    return payload;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = buildPayload();
    if (!payload) return;

    if (editingCouponId) {
      updateMutation.mutate({ id: editingCouponId, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const startEdit = (coupon) => {
    setEditingCouponId(coupon.id);
    setFormData({
      code: coupon.code || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: String(coupon.discountValue ?? ''),
      maxDiscountAmount: coupon.maxDiscountAmount ?? '',
      minOrderAmount: coupon.minOrderAmount ?? '',
      startsAt: toInputDateTime(coupon.startsAt),
      expiresAt: toInputDateTime(coupon.expiresAt),
      usageLimit: coupon.usageLimit ?? '',
      perUserLimit: coupon.perUserLimit ?? '1',
      isActive: Boolean(coupon.isActive),
    });
  };

  const handleToggleStatus = (coupon) => {
    toggleStatusMutation.mutate({ id: coupon.id, isActive: !coupon.isActive });
  };

  const handleDeleteCoupon = (coupon) => {
    if (!window.confirm(`Xoa coupon ${coupon.code}?`)) return;
    deleteMutation.mutate(coupon.id);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Quản lý coupon</h1>
        <p className="text-gray-600 mt-1">Tạo, chỉnh sửa và ẩn/hiện coupon không cần xóa mã</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BadgePercent className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-800">
              {editingCouponId ? 'Chinh sua coupon' : 'Tao coupon moi'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Mã coupon *</label>
              <input
                value={formData.code}
                onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                maxLength={30}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="VD: TET2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Kiểu giảm</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => handleFieldChange('discountType', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">Phần trăm (%)</option>
                  <option value="fixed">Số tiền cố định (VND)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Giá trị giảm *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) => handleFieldChange('discountValue', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {formData.discountType === 'percentage' && (
              <div>
                <label className="block text-sm text-gray-700 mb-1">Giảm tối đa (VND)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.maxDiscountAmount}
                  onChange={(e) => handleFieldChange('maxDiscountAmount', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Đơn tối thiểu (VND)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minOrderAmount}
                  onChange={(e) => handleFieldChange('minOrderAmount', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Mỗi user</label>
                <input
                  type="number"
                  min="1"
                  value={formData.perUserLimit}
                  onChange={(e) => handleFieldChange('perUserLimit', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Tổng lượt sử dụng</label>
              <input
                type="number"
                min="1"
                value={formData.usageLimit}
                onChange={(e) => handleFieldChange('usageLimit', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Bắt đầu</label>
                <input
                  type="datetime-local"
                  value={formData.startsAt}
                  onChange={(e) => handleFieldChange('startsAt', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Hết hạn *</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => handleFieldChange('expiresAt', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleFieldChange('isActive', e.target.checked)}
              />
              Bat ngay sau khi luu
            </label>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-60"
              >
                {isSubmitting ? 'Dang luu...' : editingCouponId ? 'Cap nhat coupon' : 'Tao coupon'}
              </button>
              {editingCouponId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Huy
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Danh sách coupon</h2>
            <div className="relative w-full max-w-sm">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tim theo ma"
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-gray-500">Đang tải coupon...</div>
          ) : filteredCoupons.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <Ticket className="mx-auto mb-3 text-gray-300" size={36} />
              Chưa có coupon nào
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCoupons.map((coupon) => {
                const isPercentage = coupon.discountType === 'percentage';
                const isToggling = toggleStatusMutation.isLoading && toggleStatusMutation.variables?.id === coupon.id;
                const isDeleting = deleteMutation.isLoading && deleteMutation.variables === coupon.id;
                return (
                  <div key={coupon.id} className="border rounded-xl p-4 hover:bg-gray-50 transition">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
                          <Ticket size={14} /> {coupon.code}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {coupon.isActive ? 'Dang bat' : 'Dang an'}
                        </span>
                      </div>
                      <span className="font-semibold text-gray-800">
                        {isPercentage
                          ? `${coupon.discountValue}%`
                          : `${Number(coupon.discountValue || 0).toLocaleString('vi-VN')} VND`}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                      <div>Đơn tối thiểu: {Number(coupon.minOrderAmount || 0).toLocaleString('vi-VN')} VND</div>
                      <div>Giới hạn tổng: {coupon.usageLimit || 'Không giới hạn'}</div>
                      <div>Giới hạn mỗi user: {coupon.perUserLimit || 'Không giới hạn'}</div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={13} /> Hết hạn: {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleString('vi-VN') : 'N/A'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <UserCircle2 size={13} /> Người tạo: {coupon.createdBy?.name || 'Khong ro'} ({coupon.createdBy?.userId || 'N/A'})
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <UserCircle2 size={13} /> Người sửa cuối: {coupon.updatedBy?.name || 'Khong ro'} ({coupon.updatedBy?.userId || 'N/A'})
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(coupon)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
                      >
                        <Edit2 size={14} /> Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(coupon)}
                        disabled={isToggling || isDeleting}
                        className={`px-3 py-1.5 rounded-lg text-white ${coupon.isActive ? 'bg-gray-600 hover:bg-gray-700' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-60`}
                      >
                        {isToggling ? 'Đang cập nhật...' : coupon.isActive ? 'Ẩn coupon' : 'Hiện coupon'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(coupon)}
                        disabled={isDeleting || isToggling}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                      >
                        <Trash2 size={14} /> {isDeleting ? 'Dang xoa...' : 'Xoa'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CouponManagement;
