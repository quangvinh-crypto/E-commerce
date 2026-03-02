import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { CustomerLayout } from '../../components/layout';
import { useCart } from '../../contexts/CartContext';
import paymentService from '../../services/paymentService';

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [resolvedSuccess, setResolvedSuccess] = useState(false);
  const [resolvedMessage, setResolvedMessage] = useState('');
  const [isResolving, setIsResolving] = useState(true);
  const { clearCart } = useCart();

  const status = searchParams.get('status');
  const orderId = searchParams.get('orderId');
  const orderNumber = searchParams.get('orderNumber');
  const message = searchParams.get('message');

  const isSuccess = resolvedSuccess;

  useEffect(() => {
    let mounted = true;

    const resolvePaymentResult = async () => {
      const hasSuccessParam = status === 'success';
      const incomingMessage = message || '';
      const pendingOrderId = sessionStorage.getItem('pending_vnpay_order_id');
      const targetOrderId = orderId || pendingOrderId;

      if (!targetOrderId) {
        if (!mounted) return;
        setResolvedSuccess(hasSuccessParam);
        setResolvedMessage(incomingMessage);
        setIsResolving(false);
        if (hasSuccessParam) {
          clearCart({ silent: true });
        }
        return;
      }

      try {
        const statusRes = await paymentService.getPaymentStatus(targetOrderId);
        const paid = statusRes?.data?.paymentStatus === 'paid';
        if (!mounted) return;

        setResolvedSuccess(paid);
        setResolvedMessage(
          paid
            ? ''
            : incomingMessage || 'Thanh toán chưa thành công. Vui lòng thử lại.'
        );

        if (paid) {
          clearCart({ silent: true });
          sessionStorage.removeItem('pending_vnpay_order_id');
        }
      } catch (_) {
        if (!mounted) return;
        setResolvedSuccess(hasSuccessParam);
        setResolvedMessage(incomingMessage || 'Không thể xác minh trạng thái thanh toán.');
        if (hasSuccessParam) {
          clearCart({ silent: true });
          sessionStorage.removeItem('pending_vnpay_order_id');
        }
      } finally {
        if (mounted) {
          setIsResolving(false);
        }
      }
    };

    resolvePaymentResult();

    return () => {
      mounted = false;
    };
  }, [status, message, orderId, clearCart]);

  useEffect(() => {
    if (isResolving) return undefined;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(isSuccess ? '/profile/orders' : '/cart');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuccess, navigate, isResolving]);

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-zinc-900 border border-gray-800 rounded-xl p-8 text-center">
          {isResolving ? (
            <>
              <Loader2 size={80} className="mx-auto text-amber-500 mb-6 animate-spin" />
              <h1 className="text-3xl font-bold text-gray-100 mb-4">Đang xác minh thanh toán...</h1>
              <p className="text-gray-400">Vui lòng chờ trong giây lát.</p>
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle size={80} className="mx-auto text-green-500 mb-6" />
              <h1 className="text-3xl font-bold text-gray-100 mb-4">Thanh Toán Thành Công!</h1>
              <p className="text-gray-400 mb-2">Cảm ơn bạn đã đặt hàng.</p>
              {orderNumber && (
                <p className="text-gray-300 mb-6">
                  Mã đơn hàng: <span className="text-amber-500 font-semibold">{orderNumber}</span>
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to={orderId ? `/profile/orders/${orderId}` : '/profile/orders'}
                  className="bg-amber-500 text-black px-6 py-3 rounded-full font-semibold hover:bg-amber-400"
                >
                  Xem Chi Tiết Đơn Hàng
                </Link>
                <Link
                  to="/products"
                  className="bg-zinc-800 text-gray-100 px-6 py-3 rounded-full font-semibold hover:bg-zinc-700"
                >
                  Tiếp Tục Mua Sắm
                </Link>
              </div>
            </>
          ) : (
            <>
              <XCircle size={80} className="mx-auto text-red-500 mb-6" />
              <h1 className="text-3xl font-bold text-gray-100 mb-4">Thanh Toán Thất Bại</h1>
              <p className="text-gray-400 mb-2">
                {resolvedMessage || 'Đã xảy ra lỗi trong quá trình thanh toán.'}
              </p>
              <p className="text-gray-500 mb-6">Vui lòng thử lại hoặc chọn phương thức thanh toán khác.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/checkout"
                  className="bg-amber-500 text-black px-6 py-3 rounded-full font-semibold hover:bg-amber-400"
                >
                  Thử Lại
                </Link>
                <Link
                  to="/cart"
                  className="bg-zinc-800 text-gray-100 px-6 py-3 rounded-full font-semibold hover:bg-zinc-700"
                >
                  Quay Lại Giỏ Hàng
                </Link>
              </div>
            </>
          )}
          {!isResolving && (
            <p className="text-gray-500 mt-8 text-sm">
              <Loader2 size={16} className="inline animate-spin mr-2" />
              Tự động chuyển hướng sau {countdown} giây...
            </p>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
};

export default PaymentResultPage;
