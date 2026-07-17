# Lưu Thông Tin Package Info — Design

## Tổng Quan

Cho phép customer lưu thông tin các gói hàng (Package Info) vào database thay vì localStorage. Khi tạo đơn hàng mới, customer có thể chọn nhanh từ danh sách các gói hàng đã lưu để auto-fill (loại gói hàng, kích thước dài/rộng/cao, cân nặng và tên hàng), giúp tăng tốc độ tạo đơn và tăng trải nghiệm người dùng.

## Vấn Đề Hiện Tại

- Thông tin gói hàng mặc định hiện đang lưu vào `localStorage` (key: `default_package_info`).
- Chỉ lưu được **1 bộ** thông tin gói hàng duy nhất.
- Bị mất cấu hình khi xóa lịch sử trình duyệt hoặc đổi thiết bị đăng nhập.
- Không thể đặt tên hay phân biệt nhiều kích thước thùng hàng khác nhau (vd: Hộp carton lớn, Túi bóng nhỏ...).

## User Stories

- Là một customer, tôi muốn lưu thông tin gói hàng (kích thước, cân nặng, tên gói hàng) để không phải nhập lại cho các đơn hàng tương tự.
- Là một customer, tôi muốn lưu **nhiều mẫu gói hàng** khác nhau và đặt tên gợi nhớ cho chúng (vd: "Thùng 1kg", "Túi bóng nhỏ").
- Là một customer, tôi muốn chọn nhanh mẫu gói hàng từ danh sách để tự động điền (auto-fill) vào form.
- Là một customer, tôi muốn đặt một mẫu gói hàng làm mặc định để tự động điền ngay khi mở trang tạo đơn.

## Thiết Kế Kỹ Thuật

### 1. Database — Thêm bảng `customer_packages`

File: [customer.prisma](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/schema/customer.prisma)

```prisma
model CustomerPackage {
  id            Int          @id @default(autoincrement())
  customerId    String       @map("customer_id") @db.Uuid
  customer      Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)

  label         String?      // Tên gợi nhớ: "Hộp 1kg", "Túi nilon nhỏ"
  packageName   String       @map("package_name") // Tên hiển thị gói hàng
  packingTypeId Int?         @map("packing_type_id")
  packingType   PackingType? @relation(fields: [packingTypeId], references: [id], onDelete: SetNull)

  length        Float?
  width         Float?
  height        Float?
  weight        Float        // Cân nặng tính bằng Gram (gr)

  isDefault     Boolean      @default(false) @map("is_default")

  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  deletedAt     DateTime?    @map("deleted_at")

  @@index([customerId])
  @@index([customerId, isDefault])
  @@map("customer_packages")
}
```

Cần thêm relation trong `Customer`:
```prisma
model Customer {
  // ...
  packages CustomerPackage[]
}
```

Cần thêm relation trong `PackingType` (file [packing.prisma](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/schema/packing.prisma)):
```prisma
model PackingType {
  // ...
  customerPackages CustomerPackage[]
}
```

### 2. API — tRPC Router `customer.packages`

Tạo mới file: `packages/trpc/server/routers/customer/packages/_router.ts` và handler tương ứng.

| Procedure | Method | Mô tả |
|:---|:---|:---|
| `list` | `query` | Lấy danh sách gói hàng của customer (where `deletedAt == null`), sắp xếp `isDefault DESC, updatedAt DESC` |
| `create` | `mutation` | Lưu gói hàng mới. Nếu `isDefault = true` → reset các default cũ thành `false`. |
| `update` | `mutation` | Cập nhật gói hàng. Nếu `isDefault = true` → reset các default cũ thành `false`. |
| `delete` | `mutation` | Soft delete gói hàng (`deletedAt = new Date()`) |
| `setDefault` | `mutation` | Đặt một gói hàng làm mặc định |

**Business Logic tương tự Sender/Receiver:**
- Sử dụng transaction `runInTransaction()` để đảm bảo tại mỗi thời điểm chỉ có tối đa 1 gói hàng làm mặc định cho mỗi customer.

### 3. UI — Thay đổi Section Package Info trong `page.tsx`

File: [page.tsx](file:///Users/hy/SourceCode/flashship/ecom/apps/customer/src/app/orders/single/page.tsx)

#### A. Dropdown chọn Package đã lưu (Mới)
Thêm một dropdown `SearchableSelect` hoặc `Select` tiêu chuẩn phía trên form Package Info:
- Label: **"Chọn Gói hàng đã lưu"** / **"Choose saved package"**
- Danh sách options: Sắp xếp theo thứ tự mặc định lên trước.
- Khi chọn 1 option: Tự động fill các trường: `packingTypeId`, `length`, `width`, `height`, `weight`, `packageName`.
- Lưu ID của package đang chọn vào state `selectedPackageId`.

#### B. Thay đổi logic checkbox "Save your setting for repeated use"
- **Trước**: Lưu vào `localStorage` key `default_package_info`.
- **Sau**: Khi tick chọn checkbox này và tạo đơn hàng thành công:
  - Nếu `selectedPackageId` có giá trị và thông tin gói hàng có thay đổi → gọi mutation `update`.
  - Nếu `selectedPackageId` chưa có (hoặc tạo mới hoàn toàn) → gọi mutation `create`.
  - Bỏ lưu vào `localStorage`.

#### C. Khởi tạo giá trị mặc định khi Load trang
- Khi mở trang tạo đơn, gọi query `packages.list`.
- Tìm gói hàng có `isDefault === true`:
  - Điền thông tin gói hàng vào form và tick sẵn checkbox "Save your setting for repeated use".
  - Gán ID của gói hàng đó vào `selectedPackageId`.
- Nếu không có gói hàng mặc định nào trong DB:
  - Tìm trong `localStorage` xem có dữ liệu `default_package_info` cũ không (hỗ trợ migration 1 lần). Nếu có thì điền vào form và tick checkbox.

## Edge Cases

- **Xử lý đơn vị Weight**: Toàn bộ dữ liệu cân nặng trong cơ sở dữ liệu `customer_packages` sẽ được chuẩn hóa lưu dưới dạng **Gram** (gr) để khớp với trường `declaredWeight` của bảng Order.
- **Null safety**: Các chiều dài/rộng/cao có thể là `null` đối với một số loại bao bì mềm (vd: bao nilon), hệ thống cần hỗ trợ giá trị `null` cho các cột `length`, `width`, `height`.
