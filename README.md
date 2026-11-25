# PetCare Backend

REST API dùng NestJS, Prisma và PostgreSQL 16. Chạy bằng Node.js **22.22.3+ trong dòng 22.x** và npm 10.x; API mặc định ở cổng **3001**. Các lệnh bên dưới dùng PowerShell.

## Setup lần đầu

Làm theo [hướng dẫn chạy dự án](../docs/HUONG_DAN_WINDOWS_NPM.md). Tài liệu phân biệt DB rỗng và DB đang có dữ liệu, có hướng dẫn tạo/cấp mật khẩu Admin và cấu hình tunnel.

Compose ánh xạ PostgreSQL **localhost:5434 → container:5432**. File `.env.example` dùng đúng địa chỉ này. Không seed lại DB hiện có chỉ để khởi động ứng dụng.

## Chạy lại sau khi đã setup

Từ thư mục `petcare-be`:

```powershell
docker compose up -d postgres
$env:NODE_ENV = "development"
npm run dev
```

| Mục | URL |
| --- | --- |
| API | http://localhost:3001/api/v1 |
| Health API/DB | http://localhost:3001/api/v1/health |
| Swagger | http://localhost:3001/api/docs |
| Webhook | POST /api/v1/payment/sepay/webhook |

Sau khi sửa Prisma schema, chạy `npm run prisma:generate`. Sau khi đổi `.env`, khởi động lại API.

## Các lệnh thường dùng

```powershell
npm i
npm run prisma:generate
npm run build
npm run start:prod
```

`build` và `start:prod` là hai bước riêng: build xong mới chạy bản build. Bản chạy production vẫn cần PostgreSQL và biến môi trường phù hợp; tunnel local không thay thế triển khai production.

```powershell
npm run admin:set-password -- "email-admin-cua-ban@example.test"
npm run mail:verify
npm run ai:knowledge -- "Tôi muốn đặt lịch Spa"
```

Lệnh cấp mật khẩu cần chạy trong terminal tương tác, tài khoản Admin/Staff phải có sẵn; mật khẩu được nhập ẩn. Thay placeholder email trước khi chạy. `mail:verify` chỉ kiểm tra xác thực SMTP. Lệnh AI có thể gọi embedding và tạo cache local.

### Seed dữ liệu demo (chạy thủ công)

Seed chỉ thêm/cập nhật danh mục và cấu hình cửa hàng; không tạo khách hàng, lịch hẹn, đơn hàng hay giao dịch. Script yêu cầu `NODE_ENV=development` và chạy toàn bộ thay đổi trong một transaction. Trên PowerShell:

```powershell
$env:NODE_ENV = "development"
npm run seed:demo
```

Kiểm tra kỹ `DATABASE_URL` trong `.env` trước khi chạy, đặc biệt nếu trỏ tới database từ xa. Nếu seed tạo `admin@example.test` do chưa có Admin, tài khoản đó không có mật khẩu; cấp mật khẩu thủ công bằng `npm run admin:set-password -- "admin@example.test"`.

## Tài liệu

- [Setup và tunnel/webhook](../docs/HUONG_DAN_WINDOWS_NPM.md)
- [Cấu hình SePay, VA và giao hàng](../docs/sepay-online-delivery-setup.md)
- [Gmail SMTP](../docs/email-setup.md)
- [Trợ lý AI và cấu hình model/vector](../docs/ai-assistant-deployment.md)
- [Nghiệp vụ BA](BA_REQUIREMENTS.md)
- [Database và lưu ý nâng cấp](DATABASE.md)

Các lệnh `admin:set-password`, `mail:verify`, `ai:knowledge` tự build rồi chạy JavaScript bằng Node, nạp `.env` của backend. Cấu hình `.npmrc` đi kèm xử lý khai báo peer TypeScript cũ của gói test; giữ file này khi bàn giao để `npm i` dùng cùng cấu hình.
