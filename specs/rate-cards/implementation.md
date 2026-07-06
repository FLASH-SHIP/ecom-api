# Rate Cards Implementation

## Status: not-started

## Completed

## In Progress

## Blocked

## Next Steps

### Phase 1: Database Schema & Seeders
- [ ] Add `RateCardType` enum to `packages/prisma/schema.prisma`
- [ ] Add `RateCard` (with `origin` hub field) and `RateCardItem` models to `packages/prisma/schema.prisma`
- [ ] Add `CustomerGroup` and `RateCardGroup` models to `packages/prisma/schema.prisma` (no `RateCardCustomer` model)
- [ ] Add `groupId` field and relation to `Customer` model
- [ ] Run migrations: `yarn prisma migrate dev --name add_rate_cards`
- [ ] Create seeder `11-rate-cards.seeder.ts` to populate default Ecom Express/Epacket Rate Cards and items
- [ ] Register seeder in `index.ts` and run `yarn db:seed`

### Phase 2: Core Feature Logic & Services
- [ ] Implement query logic in `RateCardRepository.ts` for resolving active Rate Cards and items
- [ ] Create `calculateFreight` service method in `RateCardService.ts` implementing the dynamic `weightStep` rounding, 2-step fallback priority resolver, and STEP_FIXED, RANGE_FIXED, and RANGE_PER_KG price calculations
- [ ] Add gap and overlap continuity validator check in `RateCardService` when creating/updating Rate Cards
- [ ] Add Overlap Publishing Constraint check in `RateCardService` to reject publishing if an active card already exists for the same target group and period
- [ ] Implement dynamic Redis caching for resolved rate card lookups, and clear/invalidate caches on Rate Card write/update events
- [ ] Write unit tests in `packages/features/shipping-rate/services/__tests__/RateCardService.test.ts` to cover Epacket (0.05 step), Express (0.5 step, STEP_FIXED under 20kg, RANGE_PER_KG over 20kg), Custom Group mappings, and overlap publishing validations

### Phase 3: tRPC API Endpoints
- [ ] Create `rateCards` tRPC router (`packages/trpc/server/routers/viewer/rate-cards/`)
- [ ] Add public `calculate` procedure in `rateCards` router
- [ ] Add admin `list`, `create`, `update`, `delete`, and `listLogs` procedures in `rateCards` router
- [ ] Add admin Excel import/export procedures: `importSlabs` and `exportSlabsTemplate` in `rateCards` router
- [ ] Register router in `_app.ts` under `rateCards`

### Phase 4: UI Integrations
- [ ] Build the Rate Card Settings Screen in Admin Portal (`/settings/rates`):
  - Header inputs (Unique Code, Name, ContentStatus, Origin hub selector, Country, Target Customer Groups multi-select dropdown, validity period: startDate, endDate)
  - Weight step configuration (minWeight, maxWeight, and step selector dynamically filtered by shipping method: Epacket `[0.05, 0.10]`, Express `[0.50, 1.00]`)
  - Dynamic weight step input grid generator (with integer-based precision arithmetic)
  - Price monotonicity validation (heavier slab price >= lighter slab price)
  - Custom heavy cargo range inputs (RANGE_FIXED / RANGE_PER_KG type) below the grid
  - **Excel Import/Export**: Add template download and file upload buttons to populate slabs in 1-click
  - **"Lịch sử thay đổi" (Change Logs) Tab**: Display a list of audit logs showing which admin made changes, when, and the old vs new values comparison.

## Session Notes
- Reuses shared `@ecom/prisma` transactions helper `runInTransaction()`.
- Uses Decimal type from Prisma for weight and monetary accuracy.
