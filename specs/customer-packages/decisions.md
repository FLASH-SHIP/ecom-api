# Lưu Thông Tin Gói Hàng (Package Info) — Decisions

## ADR-001: Lưu database thay vì localStorage

### Context
Thông tin gói hàng hiện lưu trong `localStorage` bằng key `default_package_info`, dẫn đến việc giới hạn chỉ lưu được tối đa 1 cấu hình và dễ mất dữ liệu khi người dùng chuyển thiết bị hoặc xóa lịch sử duyệt web.

### Options Considered
1. **Giữ localStorage** — Đơn giản, không phát sinh code backend. Nhưng không hỗ trợ lưu nhiều mẫu và không đồng bộ giữa các thiết bị.
2. **Lưu vào bảng riêng `customer_packages`** — Đồng bộ tốt, hỗ trợ lưu và quản lý nhiều mẫu gói hàng khác nhau (Carton lớn, Hộp gỗ, Túi nilon...).
3. **Lưu dưới dạng JSON column trực tiếp trong bảng `customers`** — Khó thiết kế khóa ngoại liên kết tới bảng `packing_types` và khó quản lý logic cập nhật mẫu mặc định.

### Decision
Chọn option 2 — tạo bảng riêng `customer_packages` liên kết tới `customers` và `packing_types`.

### Consequences
- Phát sinh migration để tạo bảng mới.
- Cần tạo module code đầy đủ gồm Repository, Service, DI container, và tRPC router mới.
- Hỗ trợ cơ chế đồng bộ một lần từ `localStorage` cũ lên DB khi người dùng đăng nhập lần đầu.

---

## ADR-002: Quản lý tính duy nhất của mẫu mặc định qua Transaction

### Context
Mỗi khách hàng chỉ được phép chọn duy nhất 1 mẫu gói hàng làm mặc định (`isDefault = true`).

### Options Considered
1. **Quản lý bằng logic tuần tự ở tầng Service** — Dễ gặp tình trạng race condition nếu khách hàng gọi liên tiếp nhiều request.
2. **Sử dụng Transaction với Database Lock** — Đảm bảo tính nhất quán tuyệt đối thông qua hàm `runInTransaction()` của hệ thống.

### Decision
Chọn option 2 — Sử dụng transaction để tự động reset các mẫu cũ của khách hàng về `isDefault = false` trước khi thiết lập mẫu mới làm mặc định.
