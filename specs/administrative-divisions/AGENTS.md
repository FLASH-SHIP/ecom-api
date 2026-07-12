# AGENTS.md — Vietnam Administrative Divisions

## Project Context

This module provides a simplified 2-Level (Province -> Ward) directory structure to manage administrative regions in Vietnam. Wards reference their parent Province directly via the Province's unique `code`.

## Before Starting Work

1. Read specs/administrative-divisions/design.md
2. Check specs/administrative-divisions/implementation.md for current progress
3. Look at existing patterns in packages/features/packing/ and packages/trpc/server/routers/viewer/packing/

## Code Patterns

- **Prisma Schema**: Declare models in `packages/prisma/schema/administrative.prisma`. Always use folder-based schemas.
- **Repository Pattern**: Keep database operations (filtering, sorting) inside repositories, never in services.
- **tRPC Procedures**: Do not use try-catch inside procedures. Allow `ErrorWithCode` thrown by services to bubble up so that the global error handler middleware maps it to `TRPCError` automatically.
- **Client Components**: Always use type-safe type imports (`import type { ... } from "@ecom/prisma"`) to prevent prisma/pg packages from being bundled into client code.

## Don't

- Don't add a District (tier 2) level. Wards map directly to Provinces.
- Don't use `include` inside Prisma queries. Always specify detailed `select` shapes.
