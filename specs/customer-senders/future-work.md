# Lưu Thông Tin Sender — Future Work

Ideas và cải tiến defer từ bản triển khai đầu tiên.

## Enhancements

- **Áp dụng tương tự cho Receiver:** Lưu thông tin Receiver vào DB, dropdown chọn nhanh
- **Áp dụng cho Package:** Lưu thông tin Package mặc định (dimensions, weight)
- **Trang quản lý Sender riêng:** Settings page để xem, sửa, xóa tất cả Sender (thay vì chỉ inline trong form tạo đơn)
- **Import/Export:** Cho phép customer import danh sách Sender từ CSV/Excel
- **Label bắt buộc:** Yêu cầu nhập label khi lưu Sender để dễ phân biệt

## Technical Debt

- **Migration localStorage:** Tự động migrate data cũ từ `localStorage("default_sender_info")` sang DB lần đầu tiên customer đăng nhập
- **Giới hạn số lượng:** Đặt giới hạn max Sender per customer nếu cần (performance)

## Nice to Have

- **Chia sẻ Sender giữa team:** Nếu có tính năng team/organization, cho phép share Sender addresses
- **Validation địa chỉ:** Kết nối API validate địa chỉ thực tế (Google Maps, etc.)
- **Gợi ý từ đơn cũ:** Tự động suggest lưu Sender khi phát hiện thông tin mới chưa có trong danh sách
- **Đánh dấu Sender yêu thích:** Star/pin Sender hay dùng nhất lên đầu dropdown
