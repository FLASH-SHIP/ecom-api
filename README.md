# Ecom

A full-featured, production-ready Content Management System built with Next.js, tRPC, Prisma, and TypeScript.

## Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **Yarn** v4 (Corepack)
- **Docker** (for PostgreSQL + Redis)

### Setup

```bash
# Clone and install
git clone <repo-url>
cd ecom
corepack enable
yarn install

# Start databases
yarn docker:up

# Setup environment
cp .env.example .env
# Edit .env with your database URL

# Generate Prisma types and run migrations
yarn prisma generate
yarn prisma migrate dev

# Start development
yarn dev
```

### Available Commands

| Command | Description |
|---------|-------------|
| `yarn dev` | Start admin + API dev servers |
| `yarn dev:admin` | Start admin panel only (port 3000) |
| `yarn dev:customer` | Start customer site only |
| `yarn type-check:ci` | Type check all packages |
| `yarn biome check --write .` | Lint and format |
| `TZ=UTC yarn test` | Run all unit tests |
| `yarn prisma generate` | Regenerate Prisma types |
| `yarn prisma migrate dev` | Run database migrations |
| `yarn docker:up` | Start PostgreSQL + Redis |

## Architecture

```
ecom/
├── apps/
│   ├── admin/          # Next.js 16 Admin Panel (App Router)
│   └── customer/       # Next.js Customer-facing site
├── packages/
│   ├── prisma/         # Database schema + migrations
│   ├── trpc/           # tRPC API layer (routers + middleware)
│   ├── features/       # Business logic (services, repositories)
│   ├── lib/            # Shared utilities (errors, cache, sanitize)
│   ├── ui/             # Shared UI components (Radix + Tailwind)
│   ├── types/          # Shared TypeScript types + Zod schemas
│   ├── i18n/           # Translations (en, vi)
│   └── config/         # Shared configuration
└── turbo.json          # Turborepo pipeline config
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **API** | tRPC v11 (type-safe) |
| **Database** | PostgreSQL 18 + Prisma v6 |
| **Cache** | Redis (ioredis) |
| **Auth** | NextAuth.js v5 + JWT |
| **Styling** | Tailwind CSS v4 |
| **UI** | Radix UI + shadcn/ui |
| **i18n** | next-intl v4 |
| **Testing** | Vitest |
| **Linting** | Biome v2 |
| **Monorepo** | Turborepo v2 + Yarn v4 |

## Features

### Content Management
- **Posts** — CRUD, rich text, featured images, scheduling, bulk operations
- **Pages** — Hierarchical pages with templates and ordering
- **Categories** — Nested tree structure with translations
- **Tags** — Taxonomy and tagging system
- **Revisions** — Content history with restore
- **Templates** — Reusable content templates
- **Custom Fields** — Extensible metadata per content type
- **Translations** — Multi-language content (vi, en)

### Media & SEO
- **Media Manager** — Upload, folders, S3 support, Sharp processing
- **SEO** — Per-page meta, sitemap, robots.txt, RSS feeds
- **Redirects** — URL redirect management
- **Taxonomies** — Custom classification system

### Users & Auth
- **Users** — CRUD, roles, permissions
- **Roles & Permissions** — Granular RBAC
- **Members** — Frontend user management
- **API Keys** — Bearer token auth (`ecom_` prefix)
- **JWT** — Access/Refresh token flow

### Engagement
- **Comments** — Moderation, nested replies
- **Contact Forms** — Submission management
- **Webhooks** — Outgoing event hooks
- **Notifications** — In-app notifications

### System
- **Dashboard** — Overview with stats
- **Audit Logs** — Track all changes
- **Settings** — Key-value configuration
- **Tools** — Import/Export, Backup
- **Health Check** — DB, Redis, Memory monitoring
- **Feature Flags** — Runtime feature toggles

### Infrastructure
- **Response Cache** — In-memory with TTL and invalidation
- **Content Locking** — Prevent concurrent editing
- **Rate Limiting** — Redis-backed sliding window
- **Input Sanitization** — XSS protection
- **Security Headers** — CSP, HSTS, X-Frame-Options
- **Graceful Shutdown** — Clean DB/Redis disconnection
- **Request Logging** — Structured API logging
- **Event Bus** — Typed event system with priorities
- **Cron Registry** — Scheduled job management

## API Architecture

### tRPC Namespaces

```
appRouter
├── viewer.*          # Admin-only (requires NextAuth session)
│   ├── posts.*
│   ├── pages.*
│   ├── categories.*
│   ├── settings.*
│   ├── contentLocks.*
│   └── ... (20+ routers)
├── public.*          # No auth required
│   ├── v1.blog.*     # Versioned API
│   ├── v1.pages.*
│   ├── health.*
│   └── blog.*, pages.*  # Backward-compatible
└── member.*          # Member auth
    └── auth.*
```

### Middleware Chain

```
publicProcedure
  → requestLogger      (structured logging)
  → enforceUserIsAuthed (auth check)
  → errorHandler        (ErrorWithCode → TRPCError)
  = authedProcedure

+ requirePermission()   (RBAC check)
+ auditLog()           (change tracking)
+ rateLimit()          (request throttling)
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | ❌ | `redis://127.0.0.1:6379` | Redis connection string |
| `NEXTAUTH_SECRET` | ✅ | — | NextAuth session encryption |
| `NEXTAUTH_URL` | ✅ | — | Application URL |
| `LOG_REQUESTS` | ❌ | `true` | Enable/disable request logging |
| `APP_VERSION` | ❌ | `1.0.0` | Version shown in health check |

## Testing

```bash
# Run all tests
TZ=UTC yarn test

# Run specific package tests
cd packages/features && npx vitest run
cd packages/lib && npx vitest run

# Run with coverage
npx vitest run --coverage
```

## Contributing

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make changes with conventional commits: `feat:`, `fix:`, `refactor:`
3. Run checks: `yarn type-check:ci && yarn biome check --write .`
4. Run tests: `TZ=UTC yarn test`
5. Create a draft PR (< 500 lines, < 10 files)

## License

Private — All rights reserved.
