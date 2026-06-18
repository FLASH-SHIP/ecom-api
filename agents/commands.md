# Build, Test & Development Commands

## Development Commands

- `yarn dev` - Start all apps (admin, customer, api) development servers
- `yarn dev:admin` - Start Admin CMS (Next.js, port 3000)
- `yarn dev:customer` - Start Customer app (Next.js, port 3001)
- `yarn dev:api` - Start NestJS API server only
- `yarn docker:up` - Start PostgreSQL + Redis via Docker Compose
- `yarn docker:down` - Stop Docker Compose services

## Build Commands

- `yarn build` - Build all packages and apps
- `yarn build:admin` - Build Admin CMS only
- `yarn build:customer` - Build Customer app only
- `yarn build:api` - Build NestJS API only
- `yarn clean` - Remove build artifacts (node_modules, .next, .turbo, dist)

## Lint & Type Check

- `yarn lint` - Run Biome across the codebase
- `yarn lint:fix` - Run Biome and apply safe fixes
- `yarn biome check --write .` - Format and lint with Biome
- `yarn type-check` - Run TypeScript type checking
- `yarn type-check:ci --force` - Type check (mandatory before pushing)

## Testing Commands

### Unit Tests

- `yarn test` - Run unit tests (vitest)
- `yarn test <filename>` - Run tests for specific file
- `yarn test <filename> -t "<testName>"` - Run specific test by name
- `yarn tdd` - Run tests in watch mode

### End-to-End Tests

- `yarn e2e` - Run end-to-end tests (Playwright)
- `yarn e2e <filename>` - Run E2E tests for specific file
- `yarn e2e <filename> --grep "<testName>"` - Run specific E2E test by name

## Database Commands

- `yarn prisma generate` - Regenerate Prisma client types
- `yarn prisma migrate dev` - Create and apply dev migration
- `yarn prisma migrate deploy` - Apply migrations (production)
- `yarn prisma studio` - Open Prisma Studio (visual editor)
- `yarn db:seed` - Seed database with initial data
- `yarn db:reset` - Reset database (drop + migrate + seed)

## Useful Development Patterns

### Running Single Tests

```bash
# Unit test specific file
yarn vitest run packages/features/blog/services/PostService.test.ts

# Run specific test by name
yarn vitest run packages/features/blog -t "should publish a draft post"

# E2E test specific file
yarn e2e tests/auth-flow.e2e.ts

# Run specific E2E test by name
yarn e2e tests/auth-flow.e2e.ts --grep "should login with credentials"
```

### Environment Setup

```bash
# 1. Start infrastructure
yarn docker:up

# 2. Copy env
cp .env.example .env

# 3. Run migrations
yarn prisma migrate dev

# 4. Seed data
yarn db:seed

# 5. Start dev servers
yarn dev
```

### Docker Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f web api

# Rebuild after Dockerfile changes
docker compose build --no-cache

# Full reset (remove volumes)
docker compose down -v && docker compose up -d
```
