# Lưu Thông Tin Receiver — Decisions

## ADR-001: Tái sử dụng pattern từ Customer Senders

### Context

Feature Receiver tương tự Sender — cùng CRUD, cùng isDefault logic, cùng UI pattern (dropdown + checkbox).

### Options Considered

1. **Copy pattern từ Senders** — Tạo Repository/Service/Router riêng biệt, cùng cấu trúc.
2. **Generic AddressBook** — Tạo 1 bảng chung `customer_addresses` với trường `type: SENDER | RECEIVER`.
3. **Kế thừa/Abstract class** — Tạo base class `CustomerAddressRepository` rồi extend.

### Decision

Chọn option 1 — Copy pattern. Vì:
- Sender và Receiver có **fields khác nhau** (sender: `address`, `city`, `ward`; receiver: `address1`, `address2`, `city`, `state`)
- Bảng riêng dễ query, dễ index, dễ maintain
- Không thêm complexity cho abstraction chưa cần

### Consequences

- Code tương tự nhưng fields khác nhau — chấp nhận được
- Nếu sau này cần thêm loại address mới → xem xét refactor thành generic

---

## ADR-002: Fields Receiver khác Sender

### Context

Receiver gửi đến US, Sender gửi từ VN — cấu trúc địa chỉ khác nhau.

### Decision

| Aspect | Sender (VN) | Receiver (US) |
|:---|:---|:---|
| Địa chỉ | 1 dòng `address` | 2 dòng `address1` + `address2` |
| Cấp hành chính | `city` (Tỉnh) + `ward` (Quận) | `state` (Bang) + `city` (Thành phố) |
| Zip code | Optional | Required |
| Country default | `"VN"` | `"US"` |

### Consequences

- Không thể dùng chung 1 bảng mà không thêm nullable fields thừa
- Schema rõ ràng, type-safe cho từng loại

---

## ADR-003: Country locked — chỉ hỗ trợ US

### Context

Hiện tại hệ thống chỉ hỗ trợ gửi hàng đến Mỹ.

### Decision

- `country` default `"US"`, auto-select, disabled trên UI
- Không cần select country cho Receiver

### Consequences

- Nếu mở rộng thêm quốc gia → cần update schema, UI, và validation
