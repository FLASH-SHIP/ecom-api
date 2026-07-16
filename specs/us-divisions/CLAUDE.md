# US States & Cities instructions

## Commands
- Run db migrate: `yarn workspace @ecom/prisma prisma migrate dev`
- Run db seed (US only): `SEED_ONLY="US Divisions" yarn workspace @ecom/prisma db:seed`
- Run unit tests: `TZ=UTC yarn test packages/features/administrative`
- Run type check: `yarn type-check:ci`
- Run biome checks: `yarn biome check --write .`

## File Guidelines
- Schema: packages/prisma/schema/administrative.prisma (model AdministrativeDivision)
- Seeder: packages/prisma/seeders/14-us-divisions.seeder.ts
- Seed data: packages/prisma/seeders/data/us-states.json, us-cities.json
- Repository: packages/features/administrative/repositories/AdministrativeDivisionRepository.ts
- Service: packages/features/administrative/services/AdministrativeService.ts
- Router: packages/trpc/server/routers/viewer/divisions/
- Admin Page: apps/admin/src/app/(main)/settings/us-divisions/
