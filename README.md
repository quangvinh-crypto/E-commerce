# E-COMMERCE

## Overview
Du an E-COMMERCE gom 2 phan chinh: `frontend` (React) va `backend` (Node.js/Express).
He thong ho tro 3 vai tro: khach hang, nhan vien, quan tri vien; bao gom mua hang, quan ly san pham, don hang, thanh toan VNPay, cache va tim kiem.

## System Architecture
- Frontend SPA goi REST API thong qua Axios.
- Backend theo layer architecture: route -> controller -> service -> model.
- Du lieu luu tren MongoDB (Mongoose).
- Redis dung cho cache.
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
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `OPENSEARCH_NODE`, `OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL`
- `ROOT_ADMIN_EMAIL`, `ROOT_ADMIN_PASSWORD`, `ROOT_ADMIN_NAME`

### Frontend
- `REACT_APP_API_URL`
