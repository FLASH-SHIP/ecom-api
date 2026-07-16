# Lưu Thông Tin Sender — Decisions

## ADR-001: Lưu database thay vì localStorage

### Context

Thông tin Sender hiện lưu vào `localStorage`, chỉ lưu được 1 bộ, mất khi xóa cache hoặc đổi thiết bị.

### Options Considered

1. **Giữ localStorage** — Đơn giản, không cần backend. Nhưng chỉ 1 bộ, mất khi đổi thiết bị.
2. **Lưu vào bảng riêng `customer_senders`** — Hỗ trợ nhiều Sender, persist trên server, sync giữa các thiết bị.
3. **Lưu vào JSON column trong bảng `customers`** — Đơn giản hơn bảng riêng, nhưng khó query và không có constraint.

### Decision

Chọn option 2 — bảng riêng `customer_senders`. Vì:
- Hỗ trợ lưu nhiều Sender
- Dễ query, index, và quản lý
- Follow pattern đã có trong project (bảng riêng cho domain entity)

### Consequences

- Cần migration tạo bảng mới
- Cần tạo Repository + Service + tRPC Router
- Cần migrate data từ localStorage (1 lần)

---

## ADR-002: Dùng `isDefault` flag thay vì bảng settings

### Context

Cần đánh dấu 1 Sender là mặc định để auto-fill khi mở form.

### Options Considered

1. **`isDefault` boolean trên mỗi Sender** — Đơn giản, cần transaction để đảm bảo chỉ 1 default.
2. **Bảng `customer_settings` riêng** lưu `defaultSenderId` — Tách biệt, nhưng thêm complexity.

### Decision

Chọn option 1 — `isDefault` trực tiếp trên `CustomerSender`. Transaction reset + set đảm bảo tính nhất quán.

### Consequences

- Cần transaction khi set default
- Index `[customerId, isDefault]` để query nhanh

---

## ADR-003: Soft delete thay vì hard delete

### Context

Customer muốn xóa Sender không dùng nữa.

### Options Considered

1. **Hard delete** — Xóa hoàn toàn, đơn giản.
2. **Soft delete (`deletedAt`)** — Giữ lại data, có thể khôi phục, audit trail.

### Decision

Chọn soft delete — follow pattern chung của project. Tất cả query phải filter `deletedAt IS NULL`.

### Consequences

- API response không bao giờ trả về records đã soft delete
- Có thể khôi phục nếu cần
