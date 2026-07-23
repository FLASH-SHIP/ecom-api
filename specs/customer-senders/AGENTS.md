# AGENTS.md — Lưu Thông Tin Sender

## Project Context

Feature cho phép customer lưu thông tin Sender vào database (bảng `customer_senders`), thay thế localStorage. Hỗ trợ lưu nhiều Sender, đánh dấu mặc định, và auto-fill khi tạo đơn.

## Before Starting Work

1. Đọc `specs/customer-senders/design.md` — thiết kế tổng quan
2. Đọc `specs/customer-senders/implementation.md` — tiến độ hiện tại
3. Xem pattern hiện tại trong:
   - `packages/features/packing/` — ví dụ Repository + Service pattern
   - `packages/trpc/server/routers/customer/` — ví dụ customer tRPC router
   - `apps/customer/src/app/orders/single/page.tsx` — trang tạo đơn (sender section)

## Code Patterns

- **Repository:** Chỉ data access, dùng `select` (không dùng `include`), soft delete qua `deletedAt`
- **Service:** Business logic, validation, transaction cho isDefault
- **tRPC:** Dùng `authedProcedure`, input validation bằng Zod
- **Frontend:** `SearchableSelect` cho dropdown, `react-hook-form` cho form, `trpc.customer.senders` cho API calls
- **DI:** Tạo container singleton trong `packages/features/di/containers/`

## Don't

- Don't thêm features ngoài design.md
- Don't dùng `include` trong Prisma queries — chỉ dùng `select`
- Don't expose `deletedAt` records trong API response
- Don't bỏ qua transaction khi xử lý `isDefault`
- Don't dùng `as any` — dùng proper types
- Don't import Prisma trực tiếp trong Service — dùng Repository qua DI
