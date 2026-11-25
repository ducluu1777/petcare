# Database PetCare

PostgreSQL 16, quản lý bằng Prisma. PetCare vận hành một cơ sở.

## Nguồn để tra cứu

- [prisma/schema.prisma](prisma/schema.prisma): tên model, cột, kiểu dữ liệu, quan hệ, index và ràng buộc hiện tại. Tên bảng thực tế theo `@@map`, tên cột khác tên thuộc tính theo `@map`.
- [prisma/migrations](prisma/migrations): lịch sử thay đổi schema. Có các bước legacy; cần đối chiếu DB đích trước khi áp dụng.
- [BA_REQUIREMENTS.md](BA_REQUIREMENTS.md): quy tắc nghiệp vụ. Trường hoặc comment legacy trong schema không thay cho quy tắc đang áp dụng.
- [Hướng dẫn chạy dự án](../docs/HUONG_DAN_WINDOWS_NPM.md): kết nối local, khởi tạo DB rỗng và tạo Admin.

## Các nhóm dữ liệu chính

| Nhóm | Model Prisma | Vai trò |
| --- | --- | --- |
| Tài khoản và xác thực | `User`, `OAuthAccount`, `AdminCredential` | Người dùng, liên kết Google, hash mật khẩu nội bộ |
| Thú cưng | `PetProfile` | Chủ hồ sơ, cân nặng, thông tin chăm sóc và lưu trữ |
| Dịch vụ và bảng giá | `Service`, `ServicePriceTier`, `SizeTier`, `ServicePrice` | Danh mục và giá; còn cấu trúc tương thích các giai đoạn trước |
| Cấu hình và lịch | `ShopSettings`, `TimeSlot`, `Booking`, `BookingService`, `BookingStatusLog` | Giờ nhận lịch, hạn mức theo khung bắt đầu, lịch và lịch sử trạng thái |
| Thu tiền Spa | `BookingPaymentIntent`, `Transaction` | QR và khoản thu/hoàn gắn với booking |
| Sản phẩm và kho | `Product`, `ProductSpec`, `ProductStockMovement` | Mặt hàng, thông số, tồn, hàng giữ và lịch sử điều chỉnh |
| Đơn hàng và giao hàng | `Order`, `OrderItem`, `DeliveryArea` | Đơn online/POS, dòng hàng, khu vực và phí giao |
| QR và đối soát đơn | `OrderPaymentIntent`, `SepayWebhookEvent`, `BankTransferReference`, `Transaction` | Mã thanh toán, sự kiện webhook, mã tham chiếu, khoản thu và đối chiếu |
| Voucher và điểm | `Voucher`, `VoucherUsage`, `LoyaltyTransaction` | Điều kiện, lượt dùng, ví voucher và sổ điểm tích lũy |
| Chăm sóc khách hàng | `ContactRequest`, `Review`, `Notification`, `AuditLog` | Yêu cầu liên hệ, đánh giá, thông báo và nhật ký thao tác |
| Trợ lý AI | `AiKnowledgeEntry`, `AiAssistantSettings`, `AiChatUsage`, `AiChatRequest` | Kiến thức, hạn mức, thống kê và chống xử lý lại request |

Các trường thời lượng còn lại phục vụ tương thích dữ liệu cũ; lịch hiện tại giới hạn theo khung giờ bắt đầu.

## Dữ liệu cần hiểu khi bảo trì

- Booking và đơn lưu các số tiền của giao dịch; thay giá catalog hoặc phí khu vực không được sửa lại hóa đơn cũ.
- `Order` có bản chụp người nhận, địa chỉ và phí giao bên cạnh liên kết `DeliveryArea`.
- `Product.stock` và `Product.reservedStock` là hai giá trị riêng. Thay tồn qua nghiệp vụ kho/đơn hàng, không sửa trực tiếp một cột rồi bỏ qua hàng đang giữ.
- `VoucherUsage` có thể biểu diễn voucher đã đổi còn trong ví hoặc lượt đã gắn booking/đơn. Đọc cùng nghiệp vụ voucher khi xử lý hủy/hoàn, không coi mọi dòng là đã tiêu.
- `LoyaltyTransaction` là lịch sử cộng/trừ điểm. Không sửa số dư `User.loyaltyPoints` độc lập với sổ điểm.
- Booking có `status` legacy và `statusV2`; xem mapper/service hiện hành khi đọc hoặc chuyển dữ liệu, không tự suy diễn hai cột luôn giống nhau.
- Một số thuộc tính ưu đãi Spa dùng `@map` tới tên cột cũ có chữ `qinpet`. Đây là tương thích tên cột, không phải tên chương trình hiển thị.
- Lịch/đơn đã hủy vẫn cần dữ liệu để tra cứu, gồm người thực hiện, thời điểm và lý do khi có. Không xóa giao dịch để biểu diễn thao tác hủy.

## Ràng buộc và xử lý trùng

Schema có khóa duy nhất cho mã booking/đơn, mã thanh toán, ID giao dịch ngoài và khóa idempotency. `SepayWebhookEvent.id` nhận diện một sự kiện; `BankTransferReference.reference` là duy nhất. Khóa ngoại và điều kiện cập nhật được dùng cùng transaction trong các service nghiệp vụ.

Các ràng buộc không thay thế kiểm tra luồng xử lý: khi bảo trì thu tiền, tồn, voucher và điểm, cần chạy các ca gửi lặp/đồng thời với DB thực. Không tự bỏ unique index hoặc đổi khóa ngoại để làm một request lỗi chạy qua.

## Nâng cấp database đang có dữ liệu

1. Sao lưu DB và kiểm tra bản sao dùng được trước khi nâng cấp.
2. Kiểm tra `DATABASE_URL` trỏ đúng DB và đúng cổng. Compose local dùng `localhost:5434`, DB trong container dùng `5432`.
3. Từ thư mục `petcare-be`, dùng `npx prisma migrate status` để xem lịch sử. Trạng thái đã áp dụng hết migration không chứng minh DB không còn sai khác legacy với schema.
4. Đối chiếu migration mới, các cột/index/khóa ngoại đang có và dữ liệu tham chiếu. Kiểm tra trên bản sao trước khi áp dụng vào DB cần giữ.
5. Sau khi áp dụng thay đổi đã rà, chạy `npm run prisma:generate`, build/restart API và kiểm tra health, đăng nhập, danh sách, đặt lịch, đơn hàng và thanh toán.

Không chạy seed, reset hoặc `db push --accept-data-loss` lên DB đang dùng để chữa lỗi. Bộ seed dữ liệu mẫu đã được gỡ; không cần chạy seed khi cài hoặc bàn giao. Không xóa cột cũ hoặc baseline migration tùy tiện vì có thể làm mất dữ liệu hoặc sai lịch sử triển khai.

Không bàn giao bản dump có dữ liệu khách qua repository công khai. Thông tin kết nối và bản sao lưu được chuyển riêng cho người vận hành.

## Chuyển database sang máy khác

Dùng nhánh này thay cho tạo bảng/seed. File `petcare.dump` chứa cả schema và dữ liệu, nên khôi phục vào **database mới, rỗng**, trước khi chạy API.

Đặt file backup vào `petcare-be`, rồi từ terminal đang ở thư mục đó chạy:

```powershell
docker cp .\petcare.dump petcare-postgres:/tmp/petcare.dump
docker compose exec postgres pg_restore -U postgres -d petcare_db --no-owner --no-privileges --exit-on-error /tmp/petcare.dump
```

Không dùng lệnh này để nhập chồng DB đang có dữ liệu. Nếu báo bảng đã tồn tại, dừng lại và kiểm tra DB đích; không tự xóa volume. Không có lỗi và mã thoát bằng 0 là đã khôi phục xong. Tài khoản Admin/mật khẩu hiện có trong backup được giữ; không cần tạo Admin mẫu hoặc chạy seed.

**Cách người bàn giao xuất backup:** từ `petcare-be`, khi PostgreSQL đang chạy:

```powershell
docker compose exec postgres pg_dump -U postgres -d petcare_db -Fc -f /tmp/petcare.dump
docker cp petcare-postgres:/tmp/petcare.dump .\petcare.dump
```

Chỉ chạy dòng sao chép sau khi `pg_dump` thành công. Các lệnh này tạo bản sao, không xóa DB nguồn. Chuyển file backup qua kênh riêng vì có dữ liệu tài khoản/khách; không đưa lên Git. Ảnh nằm trên Cloudinary, DB chỉ lưu đường dẫn, nên cần quyền/tài khoản Cloudinary được bàn giao phù hợp.


## Tạo Admin cho database mới

Chỉ làm sau khi đã tạo bảng bằng `npm run prisma:push`.

**Nếu cài mới, chưa có Admin:** mở PowerShell tại thư mục gốc `petcare`, sao chép nguyên khối sau. Khối này tạo một file lệnh tạm, thêm Admin nếu email chưa tồn tại, rồi xóa file tạm; không tạo lịch hay đơn giả:

```powershell
cd petcare-be
@'
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
try {
  await db.user.upsert({
    where: { email: "admin@example.test" },
    update: {},
    create: {
      email: "admin@example.test",
      name: "Quản trị PetCare",
      role: "ADMIN",
      isEmailVerified: true
    }
  });
  console.log("Đã kiểm tra hồ sơ. Tiếp tục cấp mật khẩu Admin.");
} finally {
  await db.$disconnect();
}
'@ | Set-Content -Encoding UTF8 .\create-local-admin.mjs
node --env-file=.env .\create-local-admin.mjs
Remove-Item .\create-local-admin.mjs
npm run admin:set-password -- admin@example.test
```
<!-- pass  petcareadmin123456-->
Nếu lệnh Node báo lỗi thì dừng và xử lý trước khi cấp mật khẩu. File tạm còn lại có thể xóa sau. Chỉ dùng nhánh này khi DB mới chưa có Admin; nhận bản backup thì dùng tài khoản trong bản bàn giao.

Lệnh npm sẽ build backend trước, sau đó terminal hỏi mật khẩu mới rồi hỏi nhập lại. Bạn **tự đặt mật khẩu ít nhất 12 ký tự**; lúc nhập không thấy ký tự hiện lên là bình thường. Nếu tài khoản đã có mật khẩu, gõ `RESET` khi được hỏi để cấp lại.

Bản code hiện tại đăng nhập Admin bằng **email + mật khẩu**, không phải username. Tài khoản mẫu là `admin@example.test`, mật khẩu là chuỗi bạn vừa đặt; không có mật khẩu mặc định. Email `.test` không nhận thư, nhưng đăng nhập Admin không cần OTP.

