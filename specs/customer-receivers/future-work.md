# Lưu Thông Tin Receiver — Future Work

Ideas và cải tiến defer từ bản triển khai đầu tiên.

## Enhancements

- **Trang quản lý Receiver riêng:** Settings page để xem, sửa, xóa tất cả Receiver
- **Import/Export:** Cho phép customer import danh sách Receiver từ CSV/Excel
- **Label bắt buộc:** Yêu cầu nhập label khi lưu Receiver để dễ phân biệt
- **Hỗ trợ nhiều quốc gia:** Mở rộng country ngoài US (Canada, UK, etc.)

## Technical Debt

- **Migration localStorage:** Tự động migrate data cũ từ `localStorage("default_receiver_info")` sang DB lần đầu tiên customer đăng nhập
- **Giới hạn số lượng:** Đặt giới hạn max Receiver per customer nếu cần

## Nice to Have

- **Validation địa chỉ:** Kết nối USPS/Google Maps API validate địa chỉ US
- **Gợi ý từ đơn cũ:** Tự động suggest lưu Receiver khi phát hiện thông tin mới
- **Đánh dấu Receiver yêu thích:** Star/pin Receiver hay dùng nhất lên đầu dropdown
- **Tìm kiếm server-side:** Khi danh sách Receiver lớn, thêm search API thay vì filter client-side
