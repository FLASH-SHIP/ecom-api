# Rate Cards - Claude Guide

Quick reference for working on the Rate Cards module.

## Commands

```bash
# Type Check
yarn type-check:ci --force

# Format & Lint
yarn biome check --write .

# Run Tests
TZ=UTC yarn test packages/features/shipping-rate/services/__tests__/RateCardService.test.ts
```

## Conventions

- **Prisma**: Always use `select` instead of `include` in queries.
- **Errors**: Throw `ErrorWithCode` for service-layer errors; throw `TRPCError` in handlers.
- **Type Safety**: Never use `as any`. Import TS types with `import type { X }`.
- **Formatting**: Always format with Biome before completing tasks.
