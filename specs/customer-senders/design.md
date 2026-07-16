# Lưu Thông Tin Sender — Design

## Tổng Quan

Cho phép customer lưu thông tin Sender vào database thay vì localStorage. Khi tạo đơn hàng mới, customer có thể chọn từ danh sách các Sender đã lưu trước đó để auto-fill, giúp tiết kiệm thời gian khi gửi hàng lặp lại.

## Vấn Đề Hiện Tại

- Thông tin Sender hiện lưu vào `localStorage` (key: `default_sender_info`)
- Chỉ lưu được **1 bộ** thông tin Sender duy nhất
- Mất dữ liệu khi xóa cache trình duyệt hoặc đổi thiết bị
- Không thể quản lý nhiều địa chỉ Sender khác nhau

## User Stories

- Là một customer, tôi muốn lưu thông tin Sender khi tạo đơn để lần sau không phải nhập lại
- Là một customer, tôi muốn lưu **nhiều** địa chỉ Sender khác nhau (ví dụ: kho Hà Nội, kho HCM)
- Là một customer, tôi muốn chọn nhanh từ danh sách Sender đã lưu để auto-fill vào form
- Là một customer, tôi muốn đặt tên cho từng Sender để dễ phân biệt
- Là một customer, tôi muốn đánh dấu 1 Sender là mặc định để auto-fill khi tạo đơn mới

## Thiết Kế Kỹ Thuật

### Database — Thêm bảng `customer_senders`

File: [customer.prisma](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/schema/customer.prisma)

```prisma
model CustomerSender {
  id         Int      @id @default(autoincrement())
  customerId String   @db.Uuid
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  label      String?           // Tên gợi nhớ: "Kho Hà Nội", "Kho HCM"
  name       String            // Tên người gửi
  phone      String?
  email      String?
  address    String            @db.Text
  city       String            // Tỉnh/Thành phố
  ward       String?           // Quận/Huyện
  zipCode    String?
  country    String            @default("VN")
  isDefault  Boolean           @default(false)

  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt
  deletedAt  DateTime?

  @@index([customerId])
  @@index([customerId, isDefault])
  @@map("customer_senders")
}
```

Cần thêm relation trong `Customer`:
```prisma
model Customer {
  // ... existing fields ...
  senders CustomerSender[]
}
```

### API — tRPC Router `customer.senders`

File mới: `packages/trpc/server/routers/customer/senders/_router.ts`

| Procedure | Method | Mô tả |
|:---|:---|:---|
| `list` | `query` | Lấy danh sách Sender của customer (where `deletedAt == null`), sắp xếp `isDefault DESC, updatedAt DESC` |
| `create` | `mutation` | Tạo Sender mới. Nếu `isDefault = true` → bỏ default cũ |
| `update` | `mutation` | Cập nhật Sender. Nếu `isDefault = true` → bỏ default cũ |
| `delete` | `mutation` | Soft delete Sender (`deletedAt = new Date()`) |
| `setDefault` | `mutation` | Đặt 1 Sender làm mặc định (bỏ default cũ trước) |

**Business Logic:**
- Khi set `isDefault = true`, phải **reset tất cả Sender cũ** của customer về `isDefault = false` trước (dùng transaction)
- Mỗi customer chỉ có **tối đa 1** Sender mặc định
- Cần tạo `SenderService` + `SenderRepository` trong `packages/features/customer/`

### UI — Thay đổi Sender Section trong `page.tsx`

#### 1. Dropdown chọn Sender đã lưu (mới)

Thêm 1 `SearchableSelect` phía trên form Sender:
- Label: **"Chọn Sender đã lưu"** / **"Choose saved sender"**
- Options: Danh sách các Sender đã lưu từ API (`label || name — city`)
- Khi chọn → auto-fill tất cả fields: name, phone, email, address, city, ward, zipCode
- Option đầu tiên: Sender có `isDefault = true` (nếu có)

#### 2. Thay đổi logic checkbox "Save your setting for repeated use"

**Hiện tại:** Lưu vào `localStorage`
**Sau:** Khi tick checkbox và submit đơn thành công:
- Gọi `trpc.customer.senders.create` để lưu vào DB
- Nếu đã chọn từ dropdown (update case) → gọi `trpc.customer.senders.update`
- Bỏ logic `localStorage.setItem("default_sender_info", ...)`

#### 3. Auto-fill khi mở form

**Hiện tại:** Đọc từ `localStorage("default_sender_info")`
**Sau:** Query `trpc.customer.senders.list` → tìm sender có `isDefault = true` → auto-fill vào form

#### 4. Quản lý Sender (tùy chọn — có thể làm ở phase sau)

- Nút "Xóa" bên cạnh dropdown để xóa Sender đã chọn
- Nút "Đặt mặc định" (star icon) để set default

## Luồng Hoạt Động

```
Mở trang tạo đơn
  │
  ├── Query senders.list
  │     ├── Có sender default → Auto-fill form + tick checkbox
  │     └── Không có → Form trống
  │
  ├── Customer chọn từ dropdown
  │     └── Auto-fill tất cả fields + lưu selectedSenderId
  │
  └── Submit đơn thành công
        ├── Checkbox ticked + không có selectedSenderId
        │     └── Gọi senders.create (lưu mới)
        ├── Checkbox ticked + có selectedSenderId + data thay đổi
        │     └── Gọi senders.update (cập nhật)
        └── Checkbox không ticked
              └── Không làm gì
```

## Edge Cases

- **Duplicate Sender:** Cho phép tạo nhiều Sender có cùng thông tin (không validate unique)
- **Default conflict:** Transaction đảm bảo chỉ có 1 default tại mọi thời điểm
- **Sender bị xóa:** Nếu sender đang chọn bị soft-delete, dropdown clear về empty
- **Migration từ localStorage:** Lần đầu nếu có data trong `localStorage` và chưa có sender trong DB → tự động tạo 1 sender từ localStorage data (migration 1 lần)

## Ngoài Phạm Vi

- Quản lý Sender trong trang riêng (settings page) — chỉ quản lý inline trong trang tạo đơn
- Chia sẻ Sender giữa các customer
- Áp dụng tương tự cho Receiver (sẽ làm riêng nếu cần)
