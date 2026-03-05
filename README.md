# E-COMMERCE

## Overview
Du an E-COMMERCE gom 2 phan chinh: `frontend` (React SPA) va `backend` (Node.js/Express REST API).
He thong ho tro 3 vai tro: khach hang, nhan vien, quan tri vien; bao gom mua hang, quan ly san pham, danh muc, don hang, coupon, review, thanh toan VNPay va tim kiem OpenSearch.

## System Architecture
- Frontend SPA goi REST API thong qua Axios.
- Backend theo layer architecture: route -> controller -> service -> model.
- Du lieu luu tren MongoDB (Mongoose).
- Redis dung cho API response cache (cache-aside cho endpoint GET).
- OpenSearch dung cho search index.
- Cloudinary dung de luu anh.

## Roles & Permissions
- `customer`: xem san pham, gio hang, checkout, theo doi don hang, cap nhat ho so.
- `staff`: quan ly san pham, danh muc, don hang, ton kho, cache, search index.
- `admin`: toan quyen staff + quan ly nguoi dung, tao tai khoan theo role.
- `root admin`: tai khoan admin goc, khong cho sua/xoa qua API.

## Tech Stack
- Frontend: React 18, React Router, React Query, Axios, Tailwind CSS, Lucide.
- Backend: Node.js, Express, Passport JWT/Google, Express Validator, Multer.
- Data/Infra: MongoDB, Redis, OpenSearch, Cloudinary, VNPay.

## Installation Guide
1. Cai dat dependency:
   - `cd backend && npm install`
   - `cd ../frontend && npm install`
2. Tao file env tu `.env.example` cho ca backend va frontend.
3. Chay MongoDB (co the dung Docker):
4. Chay backend:
   - `cd backend && npm run dev`
5. Chay frontend:
   - `cd frontend && npm start`

## Important Notes
- Redis la tuy chon: neu khong cau hinh backend van chay, chi tat cache.
- OpenSearch la tuy chon: backend van chay neu OpenSearch khong ket noi duoc (tu dong fallback query DB).
- Cloudinary la tuy chon cho upload anh; neu chua cau hinh thi cac API upload se loi.
- Tuyet doi khong commit file `.env` hoac bat ky key/secret thuc te len git.

## Deployment
- Frontend: co the deploy tren Vercel/Netlify (build command `npm run build`).
- Backend: co the deploy tren Render/Railway/VM (start command `npm start`).
- Bat buoc cau hinh bien moi truong tren he thong deploy, tuyet doi khong commit `.env`.

## Project Structure
```text
E-COMMERCE/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      repositories/
      routes/
      services/
  frontend/
    src/
      components/
      contexts/
      pages/
      services/
      utils/
```

## Environment Variables
### Backend
- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`, `JWT_EXPIRE`
- `FRONTEND_URL`
- `REDIS_URL` (uu tien) hoac `REDIS_HOST`, `REDIS_PORT`, `REDIS_USER`, `REDIS_PASSWORD`, `REDIS_TLS`
- `REDIS_CACHE_ENABLED`, `REDIS_DEFAULT_TTL`, `REDIS_KEY_PREFIX`
- `OPENSEARCH_NODE`, `OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_BASE_URL`, `VNPAY_RETURN_URL`
- `ROOT_ADMIN_EMAIL`, `ROOT_ADMIN_PASSWORD`, `ROOT_ADMIN_NAME`

### Frontend
- `REACT_APP_API_URL`
