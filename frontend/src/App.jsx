import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts
import { ManagementLayout } from './components/layout';

// Common components
import { ProtectedRoute, LoadingSpinner } from './components/common';

// Auth pages
import { LoginPage, RegisterPage, NotFoundPage } from './pages/auth';

// Admin pages
import { AdminDashboard, UserManagement, CreateUser, OrderManagement } from './pages/Admin';

// Staff pages
import {
  StaffDashboard,
  ProductManagement,
  CreateProduct,
  EditProduct,
  ProductDetailManagement,
  CategoryManagement,
  StaffOrderManagement,
  InventoryManagement,
  ReviewManagement,
} from './pages/Staff';

// Customer pages
import {
  HomePage,
  ProductListingPage,
  ProductDetailPage,
  CartPage,
  CheckoutPage,
  UserProfilePage,
  OrderHistoryPage,
  PaymentResultPage,
  CategoriesPage,
  WishlistPage,
  ChangePasswordPage,
} from './pages/customer';

function App() {
  const { isLoading, user, isAuthenticated } = useAuth();
  const [hideUnverifiedNotice, setHideUnverifiedNotice] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setHideUnverifiedNotice(false);
      return;
    }

    const dismissed = sessionStorage.getItem(`unverified_notice_dismissed_${user.id}`) === '1';
    setHideUnverifiedNotice(dismissed);
  }, [isAuthenticated, user?.id]);

  const dismissUnverifiedNotice = () => {
    if (user?.id) {
      sessionStorage.setItem(`unverified_notice_dismissed_${user.id}`, '1');
    }
    setHideUnverifiedNotice(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="App">
      {isAuthenticated && user?.role === 'customer' && user?.isVerified === false && !hideUnverifiedNotice && (
        <div className="fixed top-0 inset-x-0 z-[80] px-4 pt-3">
          <div className="max-w-5xl mx-auto bg-amber-50 border border-amber-300 text-amber-900 rounded-lg shadow-md px-4 py-3 flex items-start gap-3">
            <div className="mt-0.5">⚠</div>
            <div className="flex-1 text-sm sm:text-base font-medium">
              Tài khoản của bạn chưa được duyệt bởi admin. Một số chức năng có thể bị giới hạn.
            </div>
            <button
              type="button"
              onClick={dismissUnverifiedNotice}
              className="text-amber-700 hover:text-amber-900 text-xl leading-none px-1"
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={
            isAuthenticated && user?.role === 'admin' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : isAuthenticated && user?.role === 'staff' ? (
              <Navigate to="/staff/dashboard" replace />
            ) : (
              <HomePage />
            )
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Customer routes - Public */}
        <Route path="/products" element={<ProductListingPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/cart" element={<CartPage />} />
        
        {/* Customer routes - Protected */}
        <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="/checkout/result" element={<PaymentResultPage />} />
        <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
        <Route path="/profile/orders" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
        <Route path="/profile/orders/:id" element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} />
        <Route path="/profile/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
        <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <ManagementLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="staff/create" element={<CreateUser />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="products/create" element={<CreateProduct />} />
          <Route path="products/:id" element={<ProductDetailManagement />} />
          <Route path="products/:id/edit" element={<EditProduct />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="inventory" element={<InventoryManagement />} />
          <Route path="reviews" element={<ReviewManagement />} />
          <Route path="reports" element={<div className="p-6">Báo cáo (Sắp ra mắt)</div>} />
          <Route path="settings" element={<div className="p-6">Cài đặt (Sắp ra mắt)</div>} />
        </Route>

        {/* Staff routes */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute requiredRole={['staff', 'admin']}>
              <ManagementLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="products/create" element={<CreateProduct />} />
          <Route path="products/:id" element={<ProductDetailManagement />} />
          <Route path="products/:id/edit" element={<EditProduct />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="orders" element={<StaffOrderManagement />} />
          <Route path="inventory" element={<InventoryManagement />} />
          <Route path="reviews" element={<ReviewManagement />} />
        </Route>

        {/* Error pages */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route
          path="/unauthorized"
          element={
            <div className="flex items-center justify-center h-screen bg-zinc-950">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-red-500">403</h1>
                <p className="text-gray-400 mt-2">Unauthorized Access</p>
              </div>
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </div>
  );
}

export default App;
