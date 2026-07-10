# Vietnam Administrative Divisions Implementation

## Status: completed

## Completed
- [x] Create `packages/prisma/schema/administrative.prisma` with `Province` and `Ward` models (using camelCase columns directly).
- [x] Implement database indexes on `provinceCode` and `codeName` for fast queries.
- [x] Create seeder `packages/prisma/seeders/13-administrative.seeder.ts` to read and load data from `specs/administrative-divisions/provinces.json` and `specs/administrative-divisions/wards.json`.
- [x] Implement try-catch logic in the seeder to catch individual upsert errors and log them to `specs/administrative-divisions/seeding_errors.log`.
- [x] Ensure the seeder only uses `upsert` queries to merge data safely without erasing other tables or existing records.
- [x] Run migration: `yarn prisma:migrate --name change_administrative_columns_to_camelcase`
- [x] Run db seed: `yarn prisma:seed`
- [x] Create repositories `ProvinceRepository` and `WardRepository` with CRUD and pagination.
- [x] Create `AdministrativeService` with validation logic (uniqueness, parent checking).
- [x] Register DI singleton bindings in container.
- [x] Create tRPC `divisionsRouter` with nested procedures (`listProvinces`, `getProvince`, `listWards`, `getWard`).
- [x] Expose mutation procedures (`createProvince`, `updateProvince`, `createWard`, `updateWard`) protected by setting-write permissions.
- [x] Register `divisions` router in the root `viewer` tRPC appRouter.
- [x] Build administrative divisions settings screen layout (`/settings/divisions`).
- [x] Implement tabbed interface layout using Shadcn Tabs: Provinces tab and Wards tab.
- [x] Connect cascading filters (clicking a province row filters the Wards list dynamically and switches tab).
- [x] Build Right-Side Sheet Drawers for creating and editing provinces/wards (delete disabled).
- [x] Configure multi-language JSON files (`en/settings.json` and `vi/settings.json`).
- [x] Run typescript type checks to guarantee zero compile-time errors.
- [x] Run unit tests and verify 100% success rate without regressions.
- [x] Build walkthrough document documenting the implementation.
- [x] Migrate database schema to remove `@map` for province/ward fields (making database columns camelCase).
- [x] Re-run seeder to verify camelCase columns populate correctly.
- [x] Update Ward division type options in the select dropdown to match the dataset (`phường`, `xã`, `đặc khu`).
- [x] Include relation in WardRepository.list to fetch and display parent Province Name instead of raw provinceCode in the Wards table.

## In Progress

## Blocked

## Next Steps

### Phase 1: Database Schema & Seeders
- [x] Create `packages/prisma/schema/administrative.prisma` with `Province` and `Ward` models.
- [x] Implement database indexes on `provinceCode` and `codeName` for fast queries.
- [x] Create seeder `packages/prisma/seeders/13-administrative.seeder.ts` to read and load data from `specs/administrative-divisions/provinces.json` and `specs/administrative-divisions/wards.json`.
- [x] Implement try-catch logic in the seeder to catch individual upsert errors and log them to `specs/administrative-divisions/seeding_errors.log`.
- [x] Ensure the seeder only uses `upsert` queries to merge data safely without erasing other tables or existing records.
- [x] Run migration: `yarn prisma:migrate --name change_administrative_columns_to_camelcase`
- [x] Run db seed: `yarn prisma:seed`

### Phase 2: Repository & Service Layers
- [x] Create `ProvinceRepository` and `WardRepository` supporting pagination and filters.
- [x] Create `AdministrativeService` coordinating the logic.
- [x] Implement name/code uniqueness checks.

### Phase 3: tRPC Endpoints
- [x] Create `divisions` tRPC router (`packages/trpc/server/routers/viewer/divisions/`).
- [x] Expose query procedures (`listProvinces`, `getProvince`, `listWards`, `getWard`).
- [x] Expose mutation procedures (`createProvince`, `updateProvince`, `createWard`, `updateWard`) with authorization guards.

### Phase 4: UI Development (Admin Workspace)
- [x] Build administrative divisions settings screen at `/settings/divisions` with Shadcn Tabs.
- [x] Implement Provinces management grid in the first tab.
- [x] Implement Wards list with cascading filter (by selecting a province) in the second tab.
- [x] Build Right-Side Sheet Drawer forms (sliding from the right) for adding/editing provinces and wards (no delete feature).
- [x] Update Ward division type options in the select dropdown to match the dataset (`phường`, `xã`, `đặc khu`).

### Phase 5: Verification & Walkthrough
- [x] Migrate database schema to remove `@map` for province/ward fields (making database columns camelCase).
- [x] Re-run seeder to verify camelCase columns populate correctly.
- [x] Run typescript type checks.
- [x] Run all unit tests.
- [x] Build walkthrough document documenting the implementation.
