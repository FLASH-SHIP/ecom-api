# Lưu Thông Tin Package Info — Implementation

## Status: not-started

## Completed

## In Progress

## Blocked

## Next Steps

### Phase 1: Database Schema & Migration
1. Thêm model `CustomerPackage` vào [customer.prisma](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/schema/customer.prisma).
2. Thêm relation `packages CustomerPackage[]` vào model `Customer`.
3. Thêm relation `customerPackages CustomerPackage[]` vào model `PackingType` ở [packing.prisma](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/schema/packing.prisma).
4. Chạy lệnh tạo migration: `yarn prisma migrate dev --name add_customer_packages`.
5. Sinh lại các kiểu dữ liệu Prisma: `yarn prisma:generate`.

### Phase 2: Backend — Repository, Service & tRPC
6. Tạo `packages/features/customer/repositories/CustomerPackageRepository.ts` để xử lý các câu lệnh truy vấn dữ liệu thô:
   - `findByCustomerId(customerId)`
   - `findById(id)`
   - `create(data)`
   - `update(id, data)`
   - `softDelete(id)`
   - `resetDefault(customerId)`
7. Tạo `packages/features/customer/services/CustomerPackageService.ts` chứa logic nghiệp vụ và quản lý transaction mặc định:
   - `listByCustomer(customerId)`
   - `create(customerId, data)`
   - `update(id, customerId, data)`
   - `delete(id, customerId)`
   - `setDefault(id, customerId)`
8. Tạo DI Container tại `packages/features/di/containers/CustomerPackageService.ts`.
9. Tạo tRPC router cho packages tại `packages/trpc/server/routers/customer/packages/` bao gồm router registration và handler file.
10. Đăng ký router mới vào [_app.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/trpc/server/routers/_app.ts) dưới namespace `customer.packages`.

### Phase 3: Frontend Integration
11. Trong file [page.tsx](file:///Users/hy/SourceCode/flashship/ecom/apps/customer/src/app/orders/single/page.tsx):
    - Thêm state `selectedPackageId` và query lấy danh sách `packages.list`.
    - Thêm dropdown để chọn gói hàng đã lưu phía trên form `Package Info`.
    - Cập nhật logic khôi phục dữ liệu ban đầu (nếu có gói hàng mặc định trong DB thì dùng, ngược lại thì fallback lấy từ `localStorage` cũ).
    - Cập nhật hàm `handleCreateOrder` để khi lưu thành công đơn hàng, nếu tick chọn lưu cấu hình thì gọi API `packages.create` hoặc `packages.update`.

### Phase 4: Verification & Cleanup
12. Chạy type check toàn bộ codebase: `yarn type-check:ci --force`.
13. Chạy linter & formatter: `yarn biome check --write .`.
14. Thực hiện tạo thử đơn hàng thực tế, lưu thông tin gói hàng và kiểm tra tính năng tự động điền trong các lần tạo đơn sau.
