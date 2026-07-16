# Lưu Thông Tin Sender

## Tổng Quan

Cho phép customer lưu nhiều địa chỉ Sender vào database để tái sử dụng khi tạo đơn hàng. Thay vì nhập lại thông tin người gửi mỗi lần, customer có thể chọn nhanh từ danh sách đã lưu.

## Cách Sử Dụng

### Bước 1: Tạo đơn hàng và lưu Sender

Khi tạo đơn hàng, nhập thông tin Sender rồi tick checkbox **"Save your setting for repeated use"**. Sau khi submit đơn thành công, thông tin Sender được lưu vào database.

### Bước 2: Chọn Sender đã lưu

Lần tạo đơn tiếp theo, dropdown **"Chọn Sender đã lưu"** sẽ hiển thị phía trên form Sender. Chọn 1 sender → tất cả fields auto-fill.

### Bước 3: Sender mặc định

Sender được đánh dấu mặc định sẽ tự động fill vào form khi mở trang tạo đơn.

## Các Trường Dữ Liệu

| Trường | Mô tả | Bắt buộc |
|--------|-------|----------|
| Label | Tên gợi nhớ (VD: "Kho Hà Nội") | Không |
| Name | Tên người gửi | Có |
| Phone | Số điện thoại | Không |
| Email | Email | Không |
| Address | Địa chỉ | Có |
| City | Tỉnh/Thành phố | Có |
| Ward | Quận/Huyện | Không |
| ZipCode | Mã bưu điện | Không |
| Country | Quốc gia (mặc định: VN) | Có |

## Trường Hợp Sử Dụng Thường Gặp

### Gửi hàng từ nhiều kho

Customer có nhiều kho tại các tỉnh khác nhau. Mỗi kho lưu 1 Sender riêng với label phân biệt ("Kho HN", "Kho HCM").

### Đổi thiết bị

Vì dữ liệu lưu trên server, customer có thể đăng nhập từ thiết bị khác và vẫn thấy danh sách Sender đã lưu.

## FAQ

### Tối đa được lưu bao nhiêu Sender?

Không giới hạn.

### Có thể xóa Sender đã lưu không?

Có, bằng cách chọn Sender trong dropdown rồi nhấn nút xóa.
