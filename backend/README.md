# Backend API

## Overview
Backend duoc xay dung bang Node.js + Express, cung cap REST API cho he thong thuong mai dien tu.
Backend xu ly xac thuc, phan quyen, quan ly nguoi dung, san pham, danh muc, don hang, thanh toan va tim kiem.

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
- `GET /api/orders/my-orders`
- `GET /api/orders/:id`
- `PUT /api/orders/:id/cancel`
- `GET /api/orders` (staff/admin)

### Payment
- `POST /api/payment/create-vnpay`
- `GET /api/payment/vnpay-return`

### Cache
- `GET /api/cache/stats`
- `DELETE /api/cache/all`

### Search
- `GET /api/search`
- `POST /api/search/reindex`
- `POST /api/search/init`
- `GET /api/search/health`

## Setup
1. `npm install`
2. Tao `.env` tu `.env.example`
3. Chay MongoDB/Redis/OpenSearch (neu su dung day du)
4. Chay dev: `npm run dev`

## Environment Variables
- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`, `JWT_EXPIRE`
- `FRONTEND_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `OPENSEARCH_NODE`, `OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL`
- `ROOT_ADMIN_EMAIL`, `ROOT_ADMIN_PASSWORD`, `ROOT_ADMIN_NAME`
