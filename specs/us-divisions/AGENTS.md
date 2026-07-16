# AGENTS.md — US States & Cities

## Project Context

This module manages US states and cities using the `administrative_divisions` table (self-referencing tree structure). States are stored at level 1, cities at level 2 with `parentId` referencing their state. Data was seeded from `us-states.json` (52 states) and `us-cities.json` (~31,257 cities).

## Before Starting Work

1. Read specs/us-divisions/design.md
2. Check specs/us-divisions/implementation.md for current progress
3. Look at existing patterns in specs/administrative-divisions/ (VN provinces/wards)
4. Reference the existing UI at apps/admin/src/app/(main)/settings/divisions/DivisionsContent.tsx

## Code Patterns

- **Prisma Schema**: `AdministrativeDivision` model in `packages/prisma/schema/administrative.prisma`. Uses self-referencing tree with `parentId`.
- **Repository Pattern**: Create `AdministrativeDivisionRepository` — keep DB operations inside repositories, never in services.
- **tRPC Procedures**: Do not use try-catch inside procedures. Allow `ErrorWithCode` to bubble up.
- **Client Components**: Always use `import type { ... }` for Prisma types.
- **Unique Key**: Composite `[countryCode, code]` — always filter by `countryCode: "US"` for US data.

## Don't

- Don't mix US queries with VN provinces/wards queries — they use different tables.
- Don't use `include` inside Prisma queries. Always specify detailed `select` shapes.
- Don't allow delete operations — administrative divisions cannot be deleted via UI.
