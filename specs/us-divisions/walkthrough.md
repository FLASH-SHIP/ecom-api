# US Divisions Walkthrough

## Status: in-progress

## Phase 1: Database & Seeder (Completed)

### Schema
Added `AdministrativeDivision` model to `packages/prisma/schema/administrative.prisma` — self-referencing tree with `parentId`, composite unique key `[countryCode, code]`.

### Migration
`20260714033440_add_administrative_divisions_tree` — creates `administrative_divisions` table with indexes on `[countryCode, level]`, `[parentId]`.

### Seeder
`packages/prisma/seeders/14-us-divisions.seeder.ts` — seeds 52 US states (level 1) and 31,257 US cities (level 2) from bundled JSON data. Uses upsert to prevent duplicates. Handles duplicate city names within same state via suffix.

### Verification
- 52 states seeded ✅
- 31,257 cities seeded ✅
- Type check 17/17 passed ✅

## Phase 2: Backend API (Pending)

See specs/us-divisions/design.md for tRPC endpoints specification.

## Phase 3: Admin UI (Pending)

See specs/us-divisions/design.md for UI specification.
