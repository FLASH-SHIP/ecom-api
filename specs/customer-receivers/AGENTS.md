# AGENTS.md — Lưu Thông Tin Receiver

## Project Context

Feature cho phép customer lưu thông tin Receiver vào database (bảng `customer_receivers`), thay thế localStorage. Hỗ trợ lưu nhiều Receiver, đánh dấu mặc định, và auto-fill khi tạo đơn.

## Before Starting Work

1. Đọc `specs/customer-receivers/design.md` — thiết kế tổng quan
2. Đọc `specs/customer-receivers/implementation.md` — tiến độ hiện tại
3. Tham khảo pattern đã triển khai cho Senders:
   - `packages/features/customer/repositories/CustomerSenderRepository.ts`
   - `packages/features/customer/services/CustomerSenderService.ts`
   - `packages/trpc/server/routers/customer/senders/`
   - `apps/customer/src/app/orders/single/page.tsx` (phần Sender dropdown + save logic)

## Code Patterns

- **Repository:** Chỉ data access, dùng `select` (không dùng `include`), soft delete qua `deletedAt`
- **Service:** Business logic, validation, transaction cho isDefault
- **tRPC:** Dùng `authedProcedure`, `ctx.user.id` (KHÔNG dùng `ctx.session.user.id`), input validation bằng Zod
- **Frontend:** `SearchableSelect` cho dropdown, `react-hook-form` cho form, `trpc.customer.receivers` cho API calls
- **DI:** Tạo container singleton trong `packages/features/di/containers/`

## Key Differences from Senders

- Fields: `address1` + `address2` (thay vì 1 `address`), `state` (thay vì `ward`)
- Country default: `"US"` (thay vì `"VN"`)
- `zipCode` required (thay vì optional)
- State/City dùng `SearchableSelect` với server-side search (đã có sẵn)

## Don't

- Don't thêm features ngoài design.md
- Don't dùng `include` trong Prisma queries — chỉ dùng `select`
- Don't expose `deletedAt` records trong API response
- Don't bỏ qua transaction khi xử lý `isDefault`
- Don't dùng `as any` — dùng proper types
- Don't dùng `ctx.session.user.id` — dùng `ctx.user.id`
