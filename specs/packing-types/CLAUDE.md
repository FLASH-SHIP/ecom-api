# Packing Types - Claude Guide

Quick reference for working on the Packing Types module.

## Commands

```bash
# Type Check
yarn type-check --filter=@ecom/customer --filter=@ecom/admin --filter=@ecom/trpc --filter=@ecom/features

# Format & Lint
yarn biome check --write .

# Run Tests
TZ=UTC yarn test packages/features/packing/services/__tests__/PackingService.test.ts
```

## Conventions

- **Prisma**: Always use `select` instead of `include` in queries.
- **Errors**: Throw `ErrorWithCode` for service-layer errors; throw `TRPCError` in handlers.
- **Type Safety**: Never use `as any`. Import TS types with `import type { X }`.
- **Soft Delete**: Never hard-delete records. Always update `deletedAt` timestamp.
- **Formatting**: Always format with Biome before completing tasks.
