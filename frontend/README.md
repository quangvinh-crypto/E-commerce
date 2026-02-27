# Frontend

## Overview
Frontend duoc xay dung bang React theo mo hinh SPA.
Ung dung phuc vu 3 nhom nguoi dung: customer, staff, admin voi giao dien va route rieng.

## Component Structure
```text
frontend/src/
  components/
    common/      # Button, Input, spinner, protected route
    layout/      # CustomerLayout, StaffLayout, AdminLayout
    features/    # Component theo tinh nang
  pages/
    auth/
    customer/
    Staff/
    Admin/
  contexts/
  services/
  hooks/
  utils/
```

## State Management
- Context API:
  - `AuthContext`: user, role, login/logout, permission helper.
  - `CartContext`: gio hang.
  - `WishlistContext`: san pham yeu thich.
- React Query:
  - cache du lieu API, loading state, mutate va invalidate.
- Local storage/session:
  - luu token/user, mot so trang thai UI theo phien.

## API Integration
- Su dung Axios instance tai `src/services/api.js`.
- Tu dong gan `Authorization: Bearer <token>` neu da dang nhap.
- Tu dong xu ly `401` de dang xuat va dieu huong den trang login.
- Service tach rieng theo module:
  - `authService`, `userService`, `productService`, `categoryService`, `orderService`, `paymentService`.

## Setup
1. `npm install`
2. Tao `.env` tu `.env.example`
3. Chay local: `npm start`
4. Build production: `npm run build`

## Environment Variables
- `REACT_APP_API_URL` (vi du: `http://localhost:5000/api`)

Neu khong dat bien nay, ung dung se dung gia tri mac dinh trong code.
