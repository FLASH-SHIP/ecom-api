# Lưu Thông Tin Sender — Prompts

## Sync Implementation Status

Review what's been implemented for customer-senders and update specs/customer-senders/implementation.md

## Generate Tests

Write tests for CustomerSenderService. Follow existing test patterns in `packages/features/packing/services/__tests__/`.

## Code Review

Review changes for: type safety, error handling, security, edge cases. Đặc biệt kiểm tra:
- Transaction cho isDefault
- Soft delete filter trong tất cả queries
- Không expose sensitive fields

## Continue Feature

Continue working on customer-senders. Read specs/customer-senders/implementation.md for current status.

## Generate Docs with Screenshots

Generate documentation for customer-senders with screenshots:

1. Open the feature in the browser
2. Take screenshots of key UI states using the browser extension
3. Save screenshots to specs/customer-senders/docs/screenshots/
4. Create/update specs/customer-senders/docs/README.md with:
   - Feature overview
   - How to use (step-by-step with screenshots)
   - Configuration options
   - Common use cases

## Promote Docs to Public

Promote internal docs to public Mintlify docs:

1. Review specs/customer-senders/docs/README.md
2. Copy/adapt content to docs/customer-senders.mdx
3. Move screenshots to docs/images/customer-senders/
4. Update docs/mint.json navigation
5. Ensure customer-appropriate language (no internal details)
