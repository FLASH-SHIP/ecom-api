# US Divisions Implementation

## Status: in-progress

## Completed

- [x] Create `administrative_divisions` table in schema (self-referencing tree)
- [x] Create migration `20260714033440_add_administrative_divisions_tree`
- [x] Create seeder `14-us-divisions.seeder.ts` (52 states, 31,257 cities)
- [x] Register seeder in `packages/prisma/seeders/index.ts`
- [x] Run seeder — verified 52 states + 31,257 cities seeded
- [x] Type check passed (17/17)

## In Progress

- [ ] Create `AdministrativeDivisionRepository`
- [ ] Add division methods to `AdministrativeService`
- [ ] Add tRPC endpoints (`listDivisions`, `getDivision`, `createDivision`, `updateDivision`)
- [ ] Create admin UI page `/settings/us-divisions`
- [ ] Add i18n translations (EN + VI)
- [ ] Settings overview card link

## Blocked

## Next Steps

See [design.md](./design.md) for full technical spec.
