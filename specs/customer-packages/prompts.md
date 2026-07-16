# Lưu Thông Tin Gói Hàng (Package Info) — Prompts

## Sync Implementation Status

Review what's been implemented for customer-packages and update specs/customer-packages/implementation.md

## Generate Tests

Write tests for CustomerPackageService. Follow existing test patterns in `packages/features/customer/services/__tests__/`.

## Code Review

Review changes for: type safety, error handling, security, edge cases. Đặc biệt kiểm tra:
- Transaction cho isDefault
- Soft delete filter trong tất cả queries
- Không expose sensitive fields
