# PetCare Frontend

Website khách hàng và khu vực Admin dùng Next.js, React, Tailwind và npm. Chạy ở cổng **3000**, gọi backend NestJS cổng **3001**. Dùng Node.js 22.22.3+ trong dòng 22.x, npm 10.x và PowerShell theo hướng dẫn Windows.

## Setup lần đầu

Xem [hướng dẫn chạy dự án](../docs/HUONG_DAN_WINDOWS_NPM.md) để chuẩn bị DB, backend, tài khoản và tích hợp.

Từ thư mục `petcare-fe`, sao chép file mẫu nếu chưa có:

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm i
```

Cấu hình `.env.local`:

```dotenv
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
```

Google Client ID là tùy chọn, điền cùng ID ở backend nếu bật đăng nhập Google. Không đưa API key, SMTP password hoặc webhook secret vào frontend.

## Chạy

```powershell
npm run dev -- --port 3000
```

- Website: http://localhost:3000
- Đăng nhập khách: http://localhost:3000/dang-nhap
- Đăng nhập nội bộ: http://localhost:3000/dang-nhap-admin

Backend và database cần chạy để dùng các chức năng có dữ liệu. Khởi động lại frontend sau khi thay `NEXT_PUBLIC_*`.

## Build

```powershell
npm run build
npm run start -- --port 3000
```

Chỉ chạy `start` khi đã build thành công và đã dừng dev server chiếm cổng 3000.

Tunnel để test SePay trỏ về **API 3001**, không phải frontend. Các bước tạo tunnel, HMAC và SePay Test mode nằm trong [hướng dẫn chung](../docs/HUONG_DAN_WINDOWS_NPM.md).

