# Vietnam Administrative Divisions instructions

## Commands
- Run db migrate: `yarn prisma:migrate --name add_administrative_divisions`
- Run db seed: `yarn prisma:seed`
- Run unit tests: `yarn test`
- Run type check: `yarn type-check:ci --force`
- Run biome checks: `yarn biome check --write .`

## File Guidelines
- Schema: packages/prisma/schema/administrative.prisma
- Seeder: packages/prisma/seeders/13-administrative.seeder.ts
- Repositories: packages/features/administrative/repositories/
- Services: packages/features/administrative/services/
- Router: packages/trpc/server/routers/viewer/divisions/
- Admin Page: apps/admin/src/app/(main)/settings/divisions/
