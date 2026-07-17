# Lưu Thông Tin Sender — Implementation

## Status: not-started

## Completed

## In Progress

## Blocked

## Next Steps

### Phase 1: Database Schema & Migration
1. Thêm model `CustomerSender` vào [customer.prisma](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/schema/customer.prisma)
2. Thêm relation `senders CustomerSender[]` vào model `Customer`
3. Chạy migration: `yarn prisma migrate dev --name add_customer_senders`
4. Chạy `yarn prisma generate` để regenerate types

### Phase 2: Backend — Repository & Service
5. Tạo `packages/features/customer/repositories/CustomerSenderRepository.ts`
   - `findByCustomerId(customerId)` — Lấy danh sách, sắp xếp default trước
   - `findById(id)` — Tìm theo ID
   - `create(data)` — Tạo mới
   - `update(id, data)` — Cập nhật
   - `softDelete(id)` — Soft delete
   - `resetDefault(customerId)` — Set tất cả `isDefault = false`
6. Tạo `packages/features/customer/services/CustomerSenderService.ts`
   - `listByCustomer(customerId)` — Lấy danh sách
   - `create(customerId, data)` — Tạo mới + handle isDefault (transaction)
   - `update(id, customerId, data)` — Cập nhật + handle isDefault (transaction)
   - `delete(id, customerId)` — Soft delete
   - `setDefault(id, customerId)` — Đặt làm mặc định (transaction)
7. Tạo DI container `packages/features/di/containers/CustomerSenderService.ts`

### Phase 3: tRPC Router
8. Tạo `packages/trpc/server/routers/customer/senders/_router.ts`
9. Tạo handlers: `list`, `create`, `update`, `delete`, `setDefault`
10. Đăng ký router trong [_app.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/trpc/server/routers/_app.ts) → `customer.senders`

### Phase 4: Frontend — Tích hợp UI
11. Thêm dropdown "Chọn Sender đã lưu" phía trên Sender form
12. Query `senders.list` khi mount, auto-fill sender default
13. Thay logic save checkbox: `localStorage` → `senders.create` / `senders.update`
14. Bỏ logic đọc `localStorage("default_sender_info")` khi mount

### Phase 5: Verification
15. Type check: `yarn type-check:ci --force`
16. Lint: `yarn biome check --write .`
17. Test thủ công: tạo đơn, save sender, tạo đơn mới xem auto-fill

## Session Notes
