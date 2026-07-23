# Lưu Thông Tin Receiver — Design

## Tổng Quan

Cho phép customer lưu thông tin Receiver (người nhận) vào database thay vì localStorage. Khi tạo đơn hàng mới, customer có thể chọn từ danh sách các Receiver đã lưu để auto-fill, tiết kiệm thời gian khi gửi hàng đến cùng một người nhận nhiều lần.

> [!NOTE]
> Feature này hoạt động tương tự [Customer Senders](../customer-senders/design.md), áp dụng cho phía Receiver (người nhận tại Mỹ).

## Vấn Đề Hiện Tại

- Thông tin Receiver hiện lưu vào `localStorage` (key: `default_receiver_info`)
- Chỉ lưu được **1 bộ** thông tin Receiver duy nhất
- Mất dữ liệu khi xóa cache trình duyệt hoặc đổi thiết bị
- Không thể quản lý nhiều địa chỉ Receiver khác nhau

## User Stories

- Là một customer, tôi muốn lưu thông tin Receiver khi tạo đơn để lần sau không phải nhập lại
- Là một customer, tôi muốn lưu **nhiều** địa chỉ Receiver khác nhau (ví dụ: khách A ở California, khách B ở New York)
- Là một customer, tôi muốn chọn nhanh từ danh sách Receiver đã lưu để auto-fill vào form
- Là một customer, tôi muốn đặt tên (label) cho từng Receiver để dễ phân biệt
- Là một customer, tôi muốn đánh dấu 1 Receiver là mặc định để auto-fill khi tạo đơn mới

## Thiết Kế Kỹ Thuật

### Database — Thêm bảng `customer_receivers`

File: [customer.prisma](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/schema/customer.prisma)

```prisma
model CustomerReceiver {
  id         Int      @id @default(autoincrement())
  customerId String   @db.Uuid
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  label      String?           // Tên gợi nhớ: "Khách A - CA", "Kho Amazon"
  name       String            // Tên người nhận
  phone      String?
  email      String?
  address1   String   @db.Text // Địa chỉ dòng 1
  address2   String?  @db.Text // Địa chỉ dòng 2 (apt, suite, etc.)
  city       String            // Thành phố
  state      String            // Bang/State
  zipCode    String            // Mã zip
  country    String   @default("US")
  isDefault  Boolean  @default(false)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  deletedAt  DateTime?

  @@index([customerId])
  @@index([customerId, isDefault])
  @@map("customer_receivers")
}
```

Cần thêm relation trong `Customer`:
```prisma
model Customer {
  // ... existing fields ...
  receivers  CustomerReceiver[]
}
```

### So Sánh Fields: Sender vs Receiver

| Field | CustomerSender | CustomerReceiver | Ghi chú |
|:---|:---|:---|:---|
| `name` | ✅ | ✅ | Tên người gửi/nhận |
| `phone` | ✅ (optional) | ✅ (optional) | |
| `email` | ✅ (optional) | ✅ (optional) | |
| `address` | ✅ `address` | ✅ `address1` + `address2` | Receiver có 2 dòng địa chỉ |
| `city` | ✅ Tỉnh/Thành VN | ✅ City US | |
| `ward` | ✅ Quận/Huyện VN | ❌ | US không có ward |
| `state` | ❌ | ✅ Bang/State US | VN không có state |
| `zipCode` | ✅ (optional) | ✅ (required) | US zip bắt buộc |
| `country` | `"VN"` | `"US"` | Default khác nhau |

### API — tRPC Router `customer.receivers`

File mới: `packages/trpc/server/routers/customer/receivers/_router.ts`

| Procedure | Method | Mô tả |
|:---|:---|:---|
| `list` | `query` | Lấy danh sách Receiver (where `deletedAt == null`), sắp xếp `isDefault DESC, updatedAt DESC` |
| `create` | `mutation` | Tạo Receiver mới. Nếu `isDefault = true` → bỏ default cũ |
| `update` | `mutation` | Cập nhật Receiver. Nếu `isDefault = true` → bỏ default cũ |
| `delete` | `mutation` | Soft delete Receiver (`deletedAt = new Date()`) |
| `setDefault` | `mutation` | Đặt 1 Receiver làm mặc định (bỏ default cũ trước) |

**Business Logic:**
- Khi set `isDefault = true`, phải **reset tất cả Receiver cũ** của customer về `isDefault = false` trước (dùng transaction)
- Mỗi customer chỉ có **tối đa 1** Receiver mặc định
- Tạo `CustomerReceiverService` + `CustomerReceiverRepository` trong `packages/features/customer/`

### UI — Thay đổi Receiver Section trong `page.tsx`

#### 1. Dropdown chọn Receiver đã lưu (mới)

Thêm 1 `SearchableSelect` phía trên form Receiver (tương tự Sender):
- Label: **"Choose saved receiver..."**
- Options: Danh sách từ API (`label || name — city, state`)
- Khi chọn → auto-fill tất cả fields: name, phone, email, address1, address2, city, state, zipCode
- Option đầu tiên: Receiver có `isDefault = true` (nếu có)

#### 2. Thay đổi logic checkbox "Save your setting for repeated use"

**Hiện tại:** Lưu vào `localStorage("default_receiver_info")`
**Sau:** Khi tick checkbox và submit đơn thành công:
- Gọi `trpc.customer.receivers.create` để lưu vào DB
- Nếu đã chọn từ dropdown (update case) → gọi `trpc.customer.receivers.update`
- Bỏ logic `localStorage.setItem("default_receiver_info", ...)`

#### 3. Auto-fill khi mở form

**Hiện tại:** Đọc từ `localStorage("default_receiver_info")`
**Sau:** Query `trpc.customer.receivers.list` → tìm receiver có `isDefault = true` → auto-fill vào form

## Luồng Hoạt Động

```
Mở trang tạo đơn
  │
  ├── Query receivers.list
  │     ├── Có receiver default → Auto-fill form + tick checkbox
  │     └── Không có → Form trống
  │
  ├── Customer chọn từ dropdown
  │     └── Auto-fill tất cả fields + lưu selectedReceiverId
  │
  └── Submit đơn thành công
        ├── Checkbox ticked + không có selectedReceiverId
        │     └── Gọi receivers.create (lưu mới, isDefault: true)
        ├── Checkbox ticked + có selectedReceiverId
        │     └── Gọi receivers.update (cập nhật)
        └── Checkbox không ticked
              └── Không làm gì
```

## Edge Cases

- **Duplicate Receiver:** Cho phép tạo nhiều Receiver có cùng thông tin (không validate unique)
- **Default conflict:** Transaction đảm bảo chỉ có 1 default tại mọi thời điểm
- **Receiver bị xóa:** Nếu receiver đang chọn bị soft-delete, dropdown clear về empty
- **Country locked:** Receiver country luôn là `"US"`, auto set, disabled

## Ngoài Phạm Vi

- Quản lý Receiver trong trang riêng (settings page) — chỉ quản lý inline trong trang tạo đơn
- Chia sẻ Receiver giữa các customer
- Hỗ trợ quốc gia khác ngoài US
