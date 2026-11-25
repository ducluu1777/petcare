# Tài liệu nghiệp vụ PetCare

**Cập nhật: 03/11/2026**

PetCare phục vụ một cửa hàng: đặt lịch Spa/Grooming, bán sản phẩm, thanh toán và quản lý công việc hằng ngày. Tài liệu này mô tả các quy tắc nghiệp vụ hiện hành; không chứa lịch sử sửa đổi hoặc biên bản kiểm thử. Việc đáp ứng đầy đủ các quy tắc phải được kiểm tra trước khi vận hành.

## 1. Phạm vi và người sử dụng

Tên cơ sở hiển thị là **PetCare**. Hệ thống có website khách hàng và khu vực quản trị; chưa quản lý nhiều chi nhánh, khám/chữa bệnh, hãng vận chuyển hoặc bản đồ tính phí giao.

| Nhóm | Quyền và công việc |
| --- | --- |
| Khách chưa đăng nhập | Xem dịch vụ, bảng giá, sản phẩm, nội dung công khai; hỏi AI và gửi yêu cầu liên hệ |
| Khách hàng | Quản lý hồ sơ của mình, đặt/đổi/hủy lịch trong điều kiện cho phép, mua hàng, theo dõi đơn, đổi voucher và xem điểm tích lũy |
| Nhân viên | Xử lý lịch, tiếp nhận, thu ngân, bàn giao, bán tại quầy, đơn/giao hàng, kiểm kê và điều chỉnh tồn; xử lý liên hệ, kiểm duyệt đánh giá; xem lịch hoạt động |
| Quản trị viên | Toàn bộ công việc của nhân viên; thêm quyền quản lý tài khoản/vai trò/điểm thủ công, dịch vụ/bảng giá, thông tin sản phẩm, voucher/ưu đãi, khu vực giao, cấu hình lịch và AI |

Nhân viên và quản trị viên dùng cùng khu vực vận hành nhưng không có quyền cấu hình như nhau. Không cho nhân viên vượt quyền bằng cách gọi API trực tiếp. Tài khoản nội bộ không dùng phiên khách để nhận quyền lợi mua hàng/đặt lịch; khi phục vụ khách phải chọn đúng tài khoản khách hàng.

## 2. Tài khoản và hồ sơ thú cưng

### 2.1. Đăng nhập và quản lý tài khoản

- Khách đăng nhập bằng email OTP hoặc Google. Số điện thoại dùng liên hệ và tra cứu tại quầy, không phải cách đăng nhập.
- Admin/Staff đăng nhập ở trang nội bộ bằng email và mật khẩu; không phụ thuộc OTP. Mật khẩu chỉ lưu dạng băm.
- Chủ hệ thống đặt/cấp lại mật khẩu nội bộ bằng công cụ cục bộ có nhập ẩn. Quên mật khẩu thì liên hệ chủ hệ thống; không đặt lại mật khẩu nội bộ qua email.
- Nhân viên mới đăng ký tài khoản khách, quản trị viên đổi vai trò rồi chủ hệ thống cấp mật khẩu nội bộ. Không có form tạo nhân viên riêng.
- Khách chỉ xem/sửa dữ liệu thuộc tài khoản mình. Không tự gộp các tài khoản khác email.
- Quản trị viên được sửa thông tin khách, khóa/mở khóa, đổi vai trò, điều chỉnh điểm có lý do và xem nhật ký. Không tự đổi vai trò, khóa hoặc xóa chính tài khoản đang thao tác.
- Khi khách yêu cầu xóa tài khoản: khóa và giữ thông tin liên hệ 30 ngày để có thể khôi phục. Hết thời hạn, gỡ thông tin liên hệ để giải phóng email/SĐT; giữ dữ liệu giao dịch cần tra cứu.

### 2.2. Hồ sơ thú cưng

- Hồ sơ gắn với đúng khách hàng có tài khoản, không gắn vào tài khoản nhân viên.
- Thông tin gồm tên, chó/mèo, giống, cân nặng, tuổi, ảnh, tình trạng tiêm phòng, lưu ý sức khỏe/tính cách và cảnh báo an toàn.
- Cân nặng nhập đến 0,1 kg, không tự làm tròn sang bậc giá khác. Khi đặt lịch mới phải có cân nặng hợp lệ; không tự điền 4,5 kg cho thú mới.
- Tạo hồ sơ tại Admin phải chọn khách có sẵn. Khách mới cần đăng ký tài khoản trước khi tiếp nhận Spa.
- Có lưu trữ/khôi phục hồ sơ. Hồ sơ lưu trữ không dùng tạo lịch mới nhưng vẫn tra được trong lịch sử.
- Không lưu trữ hồ sơ còn lịch chưa kết thúc/bàn giao. Chỉ xóa vĩnh viễn hồ sơ chưa có booking tham chiếu.
- Các vị trí nhập ảnh chỉ cho chọn file upload, có xem trước, thay và bỏ ảnh; không yêu cầu nhập đường dẫn ảnh.

## 3. Dịch vụ và bảng giá

- Quản lý dịch vụ chính và dịch vụ bổ sung. Form tạo mới để trống danh mục và dịch vụ cần chọn, không tự chọn một gói mặc định.
- Bảng giá có phạm vi dùng chung, chó hoặc mèo. Bảng riêng của loài được ưu tiên; dùng bảng chung khi phù hợp và không có bảng riêng.
- Bậc giá phải phủ liên tục phạm vi phục vụ, không chồng lấn hoặc có khoảng trống. Mỗi bậc rộng tối thiểu 5 kg; nhãn tự sinh từ khoảng cân.
- Tại mốc chung của hai bậc, dùng bậc có mức bắt đầu bằng cân nặng đó. Đúng mức tối đa của bậc cuối vẫn được nhận.
- Giới hạn phục vụ hiện tại là **20 kg** cho Tắm Spa, Grooming, Spa Mèo và phụ phí theo cân nặng. Trên 20 kg từ chối với thông báo lịch sự; không tự dùng giá bậc cuối.
- Chó đúng 20 kg dùng bậc 10–20 kg. Spa Mèo: dưới 5 kg là 220.000đ; từ đúng 5 đến 20 kg là 300.000đ. Các dịch vụ khác dùng giá đang được quản trị viên cấu hình.
- Dịch vụ bổ sung cộng giá, không cộng thời lượng giữ lịch. Không quản lý giờ hoàn tất dự kiến hoặc bàn/bồn grooming.
- Dùng ẩn/ngừng cung cấp để giữ lịch sử. Chỉ xóa cứng dịch vụ chưa có dữ liệu tham chiếu.
- Nội dung mô tả rõ thao tác chăm sóc, không hứa phòng/chữa bệnh hoặc đưa ra cam kết y tế.

## 4. Đặt lịch và công suất Spa

### 4.1. Giờ hoạt động

| Hoạt động | Giờ áp dụng |
| --- | --- |
| Cửa hàng và hỗ trợ | 08:30–20:30 mỗi ngày |
| Spa | 08:30–18:30 mỗi ngày, trừ ngày nghỉ được cấu hình |
| Giờ bắt đầu cuối cùng | 18:00 với bước lịch 30 phút |
| Khoảng bàn giao ca | Không nhận giờ bắt đầu mới từ 14:00 đến trước 15:00 |

Booking đã bắt đầu trước giờ bàn giao ca vẫn tiếp tục. Thời gian/ngày vận hành tính theo **giờ Việt Nam**. Quản trị viên cấu hình ngày nghỉ, giờ mở cửa và công suất; nhân viên xem lịch hoạt động ở chế độ chỉ đọc.

### 4.2. Công suất theo giờ bắt đầu

- Mỗi khung 30 phút có tổng số chỗ cấu hình chung cho booking online và tại quầy. Không giữ riêng chỗ online hoặc walk-in.
- Ví dụ công suất 3: 09:00 nhận tối đa 3 lịch; 09:30 có 3 chỗ riêng dù các bé ở khung trước chưa làm xong.
- Hệ thống không tính công suất theo thời lượng dịch vụ hoặc số thú đang chăm sóc.
- Walk-in lúc 09:17 vẫn ghi giờ tiếp nhận 09:17 nhưng tính vào hạn mức 09:30; nhân viên được tiếp nhận ngay.
- Chỉ walk-in tại quầy được ghi đè khi khung đầy; Admin/Staff phải ghi lý do. Không bỏ qua ngày nghỉ hoặc giờ ngừng nhận lịch.
- Khung khách chọn đã hết chỗ thì dùng/gợi ý khung còn chỗ tiếp theo, báo rõ giờ mới trước khi xác nhận; không chen vượt hạn mức.
- Khi quản trị viên đổi giờ/công suất, cấu hình áp dụng cho lượt đặt mới; lịch đã xác nhận giữ nguyên. Không thêm bước cảnh báo hay chặn lưu vì lịch cũ bị ảnh hưởng; cửa hàng tự liên hệ khách khi cần.

### 4.3. Khách đặt, đổi hoặc hủy lịch

1. Đăng nhập tài khoản khách, chọn hồ sơ hoặc thêm thú cưng, nhập/kiểm tra cân nặng ước tính.
2. Chọn dịch vụ chính và dịch vụ bổ sung, ngày và giờ còn chỗ.
3. Xem giá dự kiến và thông tin lịch, bấm xác nhận để tạo booking.

Vào trang đặt lịch từ liên kết chung phải tự chọn dịch vụ; chỉ chọn sẵn khi đi từ thẻ dịch vụ có ID hợp lệ. Chưa thu tiền Spa hoặc đặt cọc ở bước đặt lịch.

Khách có tối đa 3 booking tương lai còn hiệu lực. Khách được tự đổi/hủy lịch ở trạng thái **Đã đặt**, khi còn ít nhất 4 giờ trước hẹn. Ví dụ lịch 15:00 được tự đổi/hủy đến 11:00; sau đó liên hệ cửa hàng. Đổi giờ phải kiểm tra lại công suất và có xác nhận cuối, không tự tạo thêm một lịch khác.

## 5. Tiếp nhận, chăm sóc và bàn giao

### 5.1. Trạng thái lịch

**Đã đặt → Đã tiếp nhận → Đang chăm sóc → Chờ khách nhận → Hoàn tất.**

Có nhánh **Đã hủy** và **Không đến**. Không đến chỉ do nhân viên đánh dấu sau giờ hẹn ít nhất 20 phút, có lý do; không tự chuyển. Hai trạng thái dùng cách hiển thị phân biệt.

### 5.2. Tiếp nhận và bắt đầu

- Lễ tân tra mã lịch hoặc số điện thoại; kiểm tra đúng khách, thú cưng, dịch vụ và lưu ý an toàn.
- Khách đến trực tiếp vẫn phải gắn với tài khoản khách đang hoạt động; chọn rõ dịch vụ chính trước khi lưu.
- Việc cân/trao đổi với khách thực hiện tại cửa hàng. Nếu thông tin và giá không đổi, chọn **Bắt đầu chăm sóc** ngay; không bắt nhập lại cùng số cân hoặc tích thêm xác nhận đồng ý.
- Nếu cần sửa cân, nhập cân thực tế để tự tính giá; có thể **Cập nhật giá & bắt đầu**. Giá thay đổi cần được trao đổi với khách ngoài hệ thống trước khi làm.
- Cân vượt giới hạn hoặc không có giá phù hợp thì không bắt đầu; xử lý với khách để điều chỉnh hoặc hủy.
- Có thể gán nhân viên phụ trách, ghi chú chăm sóc, thêm dịch vụ bổ sung hợp lệ và ảnh theo quyền. Không tạo checklist vi mô cho từng thao tác grooming.
- Phiếu đã thu tiền hoặc kết thúc không được sửa cân/giá/dịch vụ để làm thay đổi hóa đơn đã chốt.

### 5.3. Nhận lại thú cưng

- Chăm sóc xong, nhân viên chuyển **Chờ khách nhận** và báo khách.
- Khi khách đến đón, thu đủ tiền; sau khi bàn giao, chọn xác nhận hoàn tất riêng.
- Thanh toán thành công chưa tự có nghĩa đã bàn giao thú cưng.
- Booking còn Chờ khách nhận sau 18:30 phát sinh phí chăm giữ **một lần/booking**, mặc định 50.000đ. Quản trị viên được chỉnh mức chung; không cộng dồn theo giờ/ngày.
- Hóa đơn hiện tách dòng dịch vụ và chăm giữ nhưng thu tổng một lần. Nếu dịch vụ đã được thu trước, chỉ thu phần phí còn thiếu, không sửa khoản thu cũ.

### 5.4. Lịch đã hủy hoặc không đến

Giữ lịch trong danh sách/lịch sử và cho tìm kiếm theo thông tin cần tra cứu: mã lịch, khách, thú cưng, giờ hẹn, dịch vụ, trạng thái và thông tin hủy khi có.

Lưu người thực hiện, thời điểm và lý do thực sự được nhập. Không dùng câu chuyển trạng thái kỹ thuật làm lý do; nếu không cung cấp thì hiện **Không cung cấp lý do**. Hủy không đồng nghĩa xóa hồ sơ hoặc xóa giao dịch.

## 6. Sản phẩm và tồn kho

- Quản trị viên tạo/sửa sản phẩm: tên, danh mục, giá, ảnh, mô tả và thông số phù hợp. Không chọn sẵn danh mục, giá bán hoặc tồn đầu kỳ.
- Giá bán phải lớn hơn 0. Giá niêm yết gạch ngang là tùy chọn, chỉ hiện khi cao hơn giá bán.
- Nhập tồn thực tế khi tạo, lưu thành tồn đầu kỳ cùng người thực hiện/thời điểm.
- Không sửa tồn trong form thông tin sản phẩm. Admin/Staff dùng thao tác **Điều chỉnh tồn** riêng, nhập tăng/giảm và lý do; lưu tồn trước/sau, người thao tác và thời gian.
- **Tồn khả dụng = tồn kho − số lượng đang giữ cho giao dịch QR tại quầy.** Không bán vượt tồn, không điều chỉnh tồn âm hoặc thấp hơn lượng đang giữ.
- Cảnh báo hàng sắp hết khi tồn khả dụng từ 0 đến 5; dùng chung ngưỡng 5 cho mọi sản phẩm.
- Hàng tặng xử lý bằng điều chỉnh tồn có lý do, không tạo đơn bán 0đ, doanh thu hoặc điểm.
- Sản phẩm dùng ngừng bán/mở bán lại; chỉ xóa cứng khi chưa có dữ liệu tham chiếu. Đơn cũ giữ tên/giá đã lưu, không lấy giá mới để thay hóa đơn cũ.

## 7. Mua hàng online và giao hàng

### 7.1. Checkout

1. Khách đăng nhập, chọn sản phẩm còn hàng và số lượng.
2. Chọn nhận tại cửa hàng hoặc nhân viên PetCare giao trong khu vực phục vụ.
3. Với đơn giao: chọn tỉnh/thành, phường/xã trong danh sách được phục vụ; nhập người nhận, điện thoại và địa chỉ chi tiết.
4. Chọn voucher đủ điều kiện nếu có, xem phí/tổng tiền, bấm **Xác nhận và thanh toán**.
5. Chuyển sang trang QR riêng có thông tin đơn, số tiền, nội dung và nút lưu ảnh QR; không dùng popup dễ đóng nhầm.

Backend kiểm tra lại tài khoản, sản phẩm, tồn, voucher, khu vực và phí ngay khi tạo đơn. Nếu điều kiện thay đổi, báo khách xem lại trước khi xác nhận số tiền mới. Không tin tổng tiền do trình duyệt tự gửi.

Đơn lưu hình thức nhận, thông tin người nhận, địa chỉ, khu vực và phí tại thời điểm đặt. Thay giá/phí sau đó không đổi đơn cũ. Khi tạo đơn online, trừ tồn và ghi lượt voucher theo đơn; nếu hủy thì hoàn lại đúng một lần.

### 7.2. Phạm vi giao và phí

Quản trị viên nhập từng tỉnh/thành, phường/xã, phí giao cố định và bật/tắt khu vực. Phí 0đ hợp lệ. Không có khu vực hoạt động thì checkout chỉ cho nhận tại cửa hàng.

Địa chỉ ngoài khu vực không tạo được đơn giao; khách có thể chuyển sang nhận tại cửa hàng hoặc liên hệ hỗ trợ. Không tự tính khoảng cách, tự bổ sung địa giới hay gọi hãng vận chuyển.

### 7.3. Xử lý và bàn giao

Chỉ xử lý đơn đã thu đủ tiền.

| Hình thức | Luồng |
| --- | --- |
| Nhận tại cửa hàng | Chờ xử lý → Đang chuẩn bị → Sẵn sàng nhận → Hoàn tất |
| Giao bởi PetCare | Chờ xử lý → Đang chuẩn bị → Sẵn sàng giao → Đang giao → Hoàn tất |
| Giao thất bại | Đang giao → Giao thất bại → giao lại hoặc xử lý hủy khi hàng đã về |

Điểm đơn online chỉ cộng khi xác nhận khách đã nhận/giao thành công. Đơn hoàn tất không sửa nội dung, số tiền hoặc chuyển ngược trạng thái qua thao tác thông thường.

### 7.4. Quá hạn và hủy đơn

- Đơn online chờ thanh toán tối đa **24 giờ** từ khi tạo. Cần hiển thị hạn rõ ràng và cảnh báo đơn tự hủy nếu chưa thanh toán.
- Hết hạn, hệ thống tự hủy đơn chưa trả tiền, trả tồn/voucher và thông báo khách. Ẩn QR; không mở lại đơn đã hủy vì tiền đến muộn.
- Nhân viên được hủy đơn online ở Chờ xử lý, Đang chuẩn bị hoặc Sẵn sàng nhận/giao, có lý do. Đơn Giao thất bại chỉ hủy/trả tồn sau khi xác nhận hàng đã về cửa hàng.
- Hủy trả tồn và voucher đúng một lần. Voucher đổi bằng điểm trả lại dưới dạng voucher, không đồng thời trả thêm điểm đã đổi.
- Chưa thu tiền thì không hoàn tiền. Đã thu tiền thì hoàn toàn bộ tiền hàng và phí giao bên ngoài, sau đó ghi nhận khoản hoàn trong PetCare.
- Tiền vào theo QR cũ, sai mã, sai tiền hoặc sau hạn chuyển hỗ trợ/đối chiếu; không tự mở lại đơn hay giao hàng.
- Đơn đã hủy vẫn hiển thị và tìm kiếm được với thông tin nhận hàng, thanh toán và lý do hủy phù hợp quyền xem.

## 8. Bán sản phẩm tại quầy

- Tạo giao dịch nguồn **Bán tại quầy**, chọn sản phẩm/số lượng và nhận tiền mặt hoặc QR.
- Có thể bán khách lẻ hoặc gắn tài khoản. Chỉ giao dịch gắn tài khoản được áp voucher và cộng điểm.
- Tiền mặt: thu đủ rồi hoàn tất bán hàng, trừ tồn và cộng điểm hợp lệ một lần.
- QR: giữ hàng và voucher tối đa **15 phút**. Xác nhận thanh toán thành công thì chuyển hàng đang giữ thành hàng đã bán, hoàn tất đơn và cộng điểm một lần.
- QR hết hạn/hủy trước thanh toán thì hủy giao dịch chờ, nhả hàng và trả voucher về ví/lượt dùng.
- Đơn bán tại quầy hoàn tất ngay khi thu đủ, không đi qua luồng chuẩn bị/giao hàng của đơn online.

## 9. Thanh toán, hóa đơn và đối soát

### 9.1. Số tiền phải thu

| Giao dịch | Công thức |
| --- | --- |
| Spa | Tiền dịch vụ chính + dịch vụ bổ sung − một ưu đãi/voucher hợp lệ + phí chăm giữ chưa thu |
| Đơn online | Tiền hàng − giảm voucher + phí giao |
| Bán tại quầy | Tiền hàng − giảm voucher |

Không giảm trực tiếp bằng điểm tích lũy. Hóa đơn không được còn 0đ do áp voucher. Giá và các khoản giảm/phí được chụp vào giao dịch, không tự đổi theo cấu hình sau đó.

### 9.2. Tiền mặt và QR

- Tiền mặt áp dụng tại quầy cho Spa/POS. Nhập tiền khách đưa, tính tiền thừa, chỉ chốt khi đủ tiền. Đơn online dùng QR, không có COD.
- QR dùng một tài khoản ngân hàng nhận chung. Khách có thể chuyển bằng ứng dụng hỗ trợ chuyển khoản ngân hàng; không có cổng thanh toán ví MoMo/ZaloPay/VNPay riêng.
- Mã thanh toán Spa bắt đầu **PCSV**, mã đơn sản phẩm bắt đầu **PCOD**; mỗi khoản có mã riêng. Mã lịch BK/mã đơn OD không thay mã thanh toán.
- PetCare điền sẵn và không cho sửa số tiền/nội dung trong màn QR. Ứng dụng ngân hàng có thể cho sửa sau khi quét, nên QR/ảnh biên nhận không chứng minh cửa hàng đã nhận đủ tiền.
- QR Spa/POS có hạn 15 phút; đơn online có hạn 24 giờ. Đổi số tiền/voucher thì hủy mã cũ và tạo mã mới phù hợp.
- SePay gửi webhook; chỉ tự xác nhận khi chữ ký hợp lệ, tiền vào đúng tài khoản, mã đúng khoản chưa hủy/chưa hết hạn và số tiền khớp chính xác.
- Webhook gửi lặp cùng giao dịch không ghi thu, trừ tồn, dùng voucher hoặc cộng điểm lần hai.
- Nếu webhook chưa đến/không khả dụng, nhân viên kiểm tra giao dịch thực tế rồi xác nhận thủ công một lần. Không bắt nhập mã giao dịch cho luồng thông thường; thông tin đối chiếu bổ sung được lưu khi có.
- Nếu khách chuyển thiếu, chờ chuyển đủ; chuyển dư thì xử lý chênh lệch bên ngoài trước khi chốt. Không xây sổ công nợ hoặc luồng trả góp trong PetCare.
- Sai thông tin, tiền đến muộn hoặc không ghép được đưa vào **Cần đối chiếu**. Nhân viên liên hệ khách, ghi cách xử lý rồi đóng mục; **Đã xử lý** không tự có nghĩa hóa đơn đã thanh toán.

### 9.3. Hóa đơn và ngoại lệ

Phiếu thanh toán có mã, thời gian, khách, các dòng dịch vụ/sản phẩm/phí, giảm giá, tổng tiền và phương thức thu. Có bản in phục vụ tại quầy; gửi xác nhận thanh toán/hóa đơn qua email khách khi có địa chỉ hợp lệ.

Khiếu nại sau khi dịch vụ/đơn đã hoàn tất do Support xử lý ngoài PetCare. Không tự sửa hóa đơn, doanh thu hoặc điểm đã chốt vì một thỏa thuận hoàn bên ngoài. Quy tắc hoàn đơn online bị hủy trước khi khách nhận vẫn áp dụng như mục 7.4. Dữ liệu đặt cọc đã có được giữ để tra cứu; không phát sinh đặt cọc mới.

## 10. Ưu đãi, voucher và điểm tích lũy

### 10.1. Ưu đãi đặt lịch Spa

- Booking Spa do khách đặt qua hệ thống, đủ điều kiện lúc đặt, hưởng giảm 5% khi chốt tiền dịch vụ; kiểm tra da/tai miễn phí và tặng một gói hạt phù hợp.
- Quản trị viên bật/tạm ngưng chương trình. Booking đã đủ điều kiện vẫn giữ quyền lợi nếu chương trình tạm ngưng sau ngày đặt.
- Mỗi hóa đơn chỉ dùng **một ưu đãi**: dùng voucher thì voucher thay mức giảm 5%, không cộng dồn.
- Tên hiển thị là **Ưu đãi đặt lịch Spa**; không dùng tên một cơ sở khác làm tên chương trình PetCare.

### 10.2. Voucher

- Quản trị viên phải chọn rõ loại **Dùng mã voucher** hoặc **Đổi bằng điểm**; không chọn sẵn loại hoặc các con số ưu đãi.
- Bắt buộc nhập mức giảm, đơn tối thiểu; voucher phần trăm phải có mức giảm tối đa, voucher đổi điểm phải có chi phí điểm.
- Áp dụng chung cho Spa, đơn online và POS, không lọc riêng theo danh mục/mặt hàng. Giảm trên tiền hàng/dịch vụ, không trên phí giao hoặc chăm giữ.
- Mã công khai dùng cho khách đủ điều kiện. Voucher cá nhân/đổi điểm chỉ tài khoản sở hữu được dùng.
- “Một lần” là mỗi tài khoản dùng tối đa một lần gộp cả ba kênh; “nhiều lần” cho cùng tài khoản dùng lại khi vẫn đủ điều kiện. Giới hạn tổng chương trình là bộ đếm riêng.
- Khách tự đổi điểm lấy voucher và chọn voucher muốn dùng. Nhân viên chỉ áp voucher khách đã chọn, không đổi hộ bằng điểm.
- Voucher còn hiệu lực hết ngày được chọn theo giờ Việt Nam; hết hạn từ 00:00 ngày kế tiếp.
- Sau phát hành chỉ sửa hạn dùng, giới hạn lượt và bật/tạm ngưng; khóa mã, mức giảm, điều kiện và chi phí điểm.
- Khi không đủ điều kiện, thông báo chung **Voucher không khả dụng.** Không lộ diễn giải kỹ thuật hoặc ép khách qua nhiều bước sửa lỗi.

### 10.3. Điểm tích lũy

- Cứ 10.000đ thực thu trên phần dịch vụ/tiền hàng sau giảm được 1 điểm, lấy phần nguyên. Ví dụ 95.000đ được 9 điểm.
- Phí giao và phí chăm giữ không tích điểm. Không có giảm giá theo hạng thành viên và không đổi điểm trực tiếp thành tiền.
- Spa cộng khi ghi nhận thu đủ; đơn online cộng khi hoàn tất bàn giao; POS gắn tài khoản cộng khi hoàn tất thanh toán. Mỗi khoản chỉ cộng một lần.
- Đổi voucher trừ điểm và thêm voucher vào ví trong cùng thao tác; không tạo trạng thái trừ điểm mà không nhận voucher.
- Khách xem lịch sử điểm của mình; Admin/Staff xem lịch sử khách theo quyền. Hiện dấu cộng/trừ, số điểm, nội dung và thời gian.
- Chỉ quản trị viên điều chỉnh điểm thủ công; bắt buộc lý do, lưu giao dịch điểm và nhật ký cùng việc cập nhật số dư.

## 11. Liên hệ, đánh giá và thông báo

- Khách gửi thông tin liên hệ và nội dung cần hỗ trợ trên website. Admin/Staff có trang quản lý riêng, tìm/lọc và cập nhật **Mới → Đang xử lý → Đã xử lý**. Yêu cầu chưa xử lý xuất hiện trên dashboard.
- Đánh giá từ 1 đến 5 sao, có nội dung và đúng dịch vụ/sản phẩm của khách. Dịch vụ được đánh giá sau khi hoàn tất hoặc đã thanh toán; sản phẩm sau khi đơn hoàn tất.
- Admin/Staff được ẩn/hiện lại đánh giá không phù hợp, bắt buộc lý do và nhật ký; không sửa nội dung khách hoặc giả đánh giá. Chưa có luồng trả lời đánh giá.
- Khách có thông báo trong tài khoản. Email gửi tới email đăng ký: xác nhận tạo lịch/đơn, một nhắc lịch trong 24 giờ trước hẹn, lịch đổi/hủy, thú cưng sẵn sàng đón, đơn sẵn sàng nhận/giao và xác nhận thanh toán phù hợp.
- Không gửi email cho từng bước Đã tiếp nhận/Đang chăm sóc, không tự gửi quảng cáo hoặc lời nhắc chăm sóc định kỳ dựa trên lịch sử. Không có SMS/Zalo tự động trong phạm vi này.
- Lỗi gửi email không được làm mất hoặc tạo lặp lịch/đơn đã lưu; lỗi gửi OTP phải được báo rõ để khách biết chưa nhận mã.

## 12. Trợ lý AI và quản lý mức sử dụng

- Tư vấn tự nhiên, ngắn gọn, xưng mình/bạn, không dùng emoji. Hiểu lời chào và thông tin tiếp nối, hỏi phần còn thiếu, không trả một đoạn quy định bất kỳ thay câu trả lời.
- Chính sách lấy từ kiến thức PetCare đang bật; giá, sản phẩm, tồn và giờ trống tra dữ liệu hiện hành. Không đưa toàn bộ dữ liệu riêng của khách vào kho kiến thức.
- Có thể gợi ý/chọn sản phẩm, thêm giỏ và hỗ trợ chọn thú cưng, dịch vụ, ngày/giờ để đặt lịch trong chat. Phải có xác nhận cuối; backend kiểm tra lại quyền, giá và công suất.
- Thêm giỏ chưa tạo đơn hoặc thu tiền. Không tự xác nhận thanh toán chỉ vì khách nhắn đã chuyển.
- Khách muốn gặp nhân viên thì đưa kênh liên hệ thật; không nói đã chuyển người thật khi chưa có tính năng tiếp nhận trực tiếp.
- Không chẩn đoán, kê thuốc hoặc hứa chữa bệnh; hướng câu hỏi sức khỏe sang bác sĩ/cơ sở phù hợp.
- Fallback chỉ khi model không khả dụng hoặc không hoàn tất phản hồi, như thiếu key, hết hạn mức, lỗi, timeout hoặc phản hồi trống; lỗi tìm tài liệu riêng lẻ không tự thay câu trả lời của model bằng nội dung máy móc.
- Màn AI cho quản trị viên theo dõi model, trạng thái cấu hình, hạn mức nội bộ, lượt dùng, token khi có, lỗi/fallback, từng yêu cầu và kiến thức đang bật. Hạn mức trong PetCare không được gọi là quota/hóa đơn thực tế của nhà cung cấp.
- Log phục vụ kiểm tra request, nguồn phản hồi, thời gian và lỗi; không phải nội dung suy luận nội bộ của model.

## 13. Dashboard điều hành ca

Ưu tiên công việc cần xử lý, sau đó mới đến số liệu kinh doanh:

1. Toàn bộ lịch chưa hoàn tất hôm nay; lịch Đã đặt đã quá giờ lên trước. Quá 20 phút thì nhắc xem xét Không đến, không tự chuyển.
2. Mọi thú cưng đang Chờ khách nhận, kể cả lịch từ hôm trước.
3. Đơn online đã thanh toán cần chuẩn bị/nhận/giao, giao thất bại và khoản quá hạn còn cần xử lý; yêu cầu liên hệ chưa xong; tồn khả dụng 0–5.
4. SePay: cấu hình, lần webhook gần nhất, toàn bộ giao dịch cần đối chiếu và 10 xác nhận thành công gần nhất.
5. AI: model, hạn mức/lượt/token, toàn bộ lỗi/fallback đã ghi nhận và 10 yêu cầu thành công gần nhất.
6. Thực thu ròng hôm nay tách tiền mặt/QR, số lịch hủy/không đến và xu hướng 7 ngày theo giờ Việt Nam.

Mỗi mục mở đúng chi tiết để thao tác; không chuyển trạng thái ngay trên dashboard. Các khối có tải/trống/lỗi, thời điểm cập nhật và làm mới riêng. Danh sách dài phân trang hoặc cuộn. Không hiển thị 0 như dữ liệu hợp lệ khi API lỗi; không khẳng định SePay đang kết nối chỉ từ việc đã điền cấu hình hoặc từng có webhook.

## 14. Nguyên tắc dữ liệu, giao diện và nghiệm thu

- Các thao tác tạo lịch/đơn, thanh toán, dùng/trả voucher, trừ/trả tồn, cộng/trừ điểm phải chống request trùng và thao tác đồng thời. Nếu dữ liệu vừa thay đổi, báo tải lại hoặc xác nhận lại thay vì ghi đè âm thầm.
- Tài khoản khách không xem/sửa dữ liệu người khác. Tài khoản nội bộ bị kiểm tra quyền ở cả giao diện và API. Google token phải được backend xác minh trước khi cấp phiên PetCare.
- Ghi nhật ký cho các thao tác nhạy cảm; hủy/lưu trữ không xóa dấu vết giao dịch. Không chỉnh dữ liệu lịch sử để áp giá hoặc ưu đãi mới.
- Ngôn ngữ thân thiện, rõ việc cần làm; dùng “Điểm tích lũy”, tên trạng thái/danh mục/vai trò tiếng Việt, không in enum nội bộ ra màn hình. Không quảng cáo phóng đại hoặc nhắc lại quy định dài dòng ở từng bước.
- Bản nháp form được giữ khi lỗi để sửa, không tự lưu khi mới chuyển bước; chỉ ghi dữ liệu sau hành động xác nhận cuối phù hợp. Tránh chọn sẵn dữ liệu dễ gây nhầm.
- Giao diện điện thoại phải cuộn được, không tràn chữ/ảnh, modal không che nút xác nhận, các chế độ lịch không bị ép nhỏ hoặc cắt nội dung.
- Nghiệm thu phải đi qua luồng khách và nhân viên: đặt/đổi/hủy/không đến, Spa/thu tiền/bàn giao, đơn online/nhận/giao/hủy, POS, voucher/điểm/tồn, upload ảnh, liên hệ, đánh giá và AI.
- Thanh toán kiểm tra bằng SePay Test mode: đúng, sai thông tin, gửi trùng, hết hạn, đến muộn, webhook gián đoạn và chạy đồng thời với xác nhận tay. Kiểm tra cài mới, cấu hình và quyền trên môi trường nhận bàn giao; không dùng tài liệu này thay biên bản nghiệm thu.

Hướng dẫn cài và chạy: [Windows/npm/Cloudflare](../docs/HUONG_DAN_WINDOWS_NPM.md). Cấu hình thanh toán: [SePay](../docs/sepay-online-delivery-setup.md). Bảo trì dữ liệu: [Database](DATABASE.md).
