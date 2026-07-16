# CLAUDE.md — Lưu Thông Tin Gói Hàng (Package Info)

## Project Context

Feature cho phép customer lưu thông tin các gói hàng (Package Info) vào database (bảng `customer_packages`), thay thế localStorage. Hỗ trợ lưu nhiều mẫu gói hàng, đánh dấu mặc định, và auto-fill khi tạo đơn.

## Before Starting Work

1. Đọc `specs/customer-packages/design.md` — thiết kế tổng quan.
2. Đọc `specs/customer-packages/implementation.md` — tiến độ hiện tại.
3. Xem pattern hiện tại trong:
   - `packages/features/customer/repositories/CustomerSenderRepository.ts` — ví dụ mẫu Repository.
   - `packages/features/customer/services/CustomerSenderService.ts` — ví dụ mẫu Service.
   - `packages/trpc/server/routers/customer/senders/` — ví dụ tRPC router.
   - `apps/customer/src/app/orders/single/page.tsx` — trang tạo đơn (package info section).

## Code Patterns

- **Repository**: Chỉ data access, dùng `select` (không dùng `include`), soft delete qua `deletedAt`.
- **Service**: Business logic, validation, transaction cho `isDefault`.
- **tRPC**: Dùng `authedProcedure`, input validation bằng Zod.
- **Frontend**: Dropdown select mẫu gói hàng, auto-fill toàn bộ các thông số tương ứng vào form, liên kết với state `selectedPackageId`.
- **DI**: Tạo container singleton trong `packages/features/di/containers/`.

## Don't

- Don't thêm features ngoài design.md.
- Don't dùng `include` trong Prisma queries — chỉ dùng `select`.
- Don't expose `deletedAt` records trong API response.
- Don't bỏ qua transaction khi xử lý `isDefault` để tránh conflict nhiều mẫu mặc định.
- Don't dùng `as any` — dùng proper types.
- Don't import Prisma trực tiếp trong Service — dùng Repository qua DI.
