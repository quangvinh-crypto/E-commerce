# Backend API

## Overview
Backend duoc xay dung bang Node.js + Express, cung cap REST API cho he thong thuong mai dien tu.
Backend xu ly xac thuc, phan quyen, quan ly nguoi dung, san pham, danh muc, don hang, coupon, review, thanh toan VNPay va tim kiem.

## Architecture Pattern
Kien truc layer:
- `routes`: dinh nghia endpoint va middleware.
- `controllers`: nhan request, tra response.
- `services`: xu ly business logic.
- `repositories`: thao tac du lieu chuyen biet (hien tai co user repository).
- `models`: schema Mongoose.
- `config`: ket noi DB, Redis, OpenSearch, Cloudinary, Passport.

## Authentication
- JWT cho login thong thuong.
- Passport JWT middleware cho route private.
- Ho tro Google OAuth qua Passport.
- Role-based access: `customer`, `staff`, `admin`.
- Co root admin seed tu dong khi khoi dong server.

## Folder Structure
```text
backend/
  src/
    app.js
    config/
    controllers/
    middleware/
    models/
    repositories/
    routes/
    services/
    validators/
  scripts/
  package.json
```

## API Endpoints
Base URL: `/api`

- `GET /api` thong tin API
- `GET /health` health check

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`

### Users (Admin)
- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/users/create` tao user theo role (co the upload avatar)

### Products
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (staff/admin)
- `PUT /api/products/:id` (staff/admin)
- `DELETE /api/products/:id` (staff/admin)

### Categories
- `GET /api/categories`
- `GET /api/categories/:id`
- `POST /api/categories` (staff/admin)
- `PUT /api/categories/:id` (staff/admin)
- `DELETE /api/categories/:id` (staff/admin)

### Orders
- `POST /api/orders`
- `GET /api/orders/my`
- `GET /api/orders/:id`
- `PUT /api/orders/:id/cancel`
- `GET /api/orders` (staff/admin)

### Payment
- `POST /api/payment/vnpay/create`
- `GET /api/payment/vnpay/return`
- `GET /api/payment/vnpay/ipn`
- `GET /api/payment/status/:orderId`

### Search
- `GET /api/search`
- `GET /api/search/suggest`

## Redis Cache
- Redis duoc tich hop theo co che response cache cho cac GET endpoint nhieu luu luong.
- Cac scope cache hien tai: `products:list`, `products:detail`, `products:reviews`, `categories:list`, `categories:detail`, `search:list`, `search:suggest`.
- Cache tu dong invalidation khi product/category/review thay doi.
- Header phan hoi: `X-Cache: HIT|MISS`.

## Setup
1. `npm install`
2. Tao `.env` tu `.env.example`
3. Chay MongoDB
4. (Tuy chon) Cau hinh Redis de bat cache API
5. (Tuy chon) Cau hinh OpenSearch de bat search index
6. Chay dev: `npm run dev`

## Environment Variables
- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`, `JWT_EXPIRE`
- `FRONTEND_URL`
- `REDIS_URL` (uu tien) hoac `REDIS_HOST`, `REDIS_PORT`, `REDIS_USER`, `REDIS_PASSWORD`, `REDIS_TLS`
- `REDIS_CACHE_ENABLED`, `REDIS_DEFAULT_TTL`, `REDIS_KEY_PREFIX`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `OPENSEARCH_NODE`, `OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_BASE_URL`, `VNPAY_RETURN_URL`
- `ROOT_ADMIN_EMAIL`, `ROOT_ADMIN_PASSWORD`, `ROOT_ADMIN_NAME`

## Security Notes
- Khong commit `.env` hoac thong tin nhay cam (API key, JWT secret, mat khau DB).
- `.env.example` chi dung gia tri placeholder.
- Nen rotate toan bo secret neu da tung bi lo.
