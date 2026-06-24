---
title: Key File Paths Reference
impact: LOW
tags: reference, files, locations
---

## Key File Paths

### Apps
- `apps/web/` — Next.js 15 Admin CMS
- `apps/web/app/` — App Router pages
- `apps/web/app/(auth)/` — Auth pages (login, register)
- `apps/web/app/(dashboard)/` — Dashboard pages
- `apps/web/app/api/auth/` — NextAuth.js route handler
- `apps/web/app/api/trpc/` — tRPC route handler
- `apps/api/` — NestJS REST API
- `apps/api/src/modules/` — NestJS feature modules
- `apps/api/src/modules/auth/` — Auth module (guards, strategies)

### Packages
- `packages/prisma/schema.prisma` — Database schema
- `packages/prisma/migrations/` — Migration files
- `packages/prisma/seed.ts` — Database seeder
- `packages/trpc/server/routers/` — tRPC routers
- `packages/trpc/server/routers/_app.ts` — Root router
- `packages/trpc/server/procedures/` — Base procedures (authed, public)
- `packages/trpc/server/middlewares/` — tRPC middlewares
- `packages/features/` — Business logic (vertical slices)
- `packages/features/di/` — Global DI tokens and container
- `packages/ui/components/` — Shared UI components
- `packages/lib/` — Utilities (errors, crypto, jwt)
- `packages/lib/dto/` — Data Transfer Objects
- `packages/i18n/locales/en/common.json` — English translations
- `packages/i18n/locales/vi/common.json` — Vietnamese translations
- `packages/config/` — Shared configuration

### Root
- `turbo.json` — Turborepo pipeline config
- `biome.json` — Biome linter/formatter config
- `docker-compose.yml` — Docker services (PostgreSQL, Redis)
- `Dockerfile` — Multi-stage Docker build
- `.env.example` — Environment variable template
