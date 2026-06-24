# Knowledge Base - Domain & Product-Specific Information

This file contains domain knowledge about the Ecom product and codebase. For coding guidelines and rules, see [`rules/`](rules/).

## When working with the Dual Auth system

Ecom uses two authentication mechanisms:

| Method | Client | How It Works |
|--------|--------|-------------|
| **NextAuth.js** (session/cookie) | Admin Web (`apps/web`) | Session stored in DB, token in httpOnly cookie |
| **JWT tokens** (access + refresh) | Mobile, Chrome Extension | Short-lived access (15min), long-lived refresh (30d) |
| **API Keys** (`ecom_xxx`) | Scripts, CI/CD | SHA256-hashed, long-lived |

### Important Auth Rules

- **Mobile login** returns `{ accessToken, refreshToken }` — client stores in SecureStorage
- **Refresh token rotation**: every refresh invalidates the old token pair
- **API keys** use the `ecom_` prefix and are hashed with SHA256 before storage
- **Never expose** `password`, `hashedKey`, `tokenHash`, or `refreshTokenHash` in any API response

## When working with RBAC (Role-Based Access Control)

Permissions follow a dot-notation pattern: `{module}.{entity}.{action}`

Examples:
- `blog.posts.create` — can create blog posts
- `blog.posts.publish` — can publish blog posts
- `users.roles.assign` — can assign roles to users
- `media.files.upload` — can upload media files

Default roles: `admin` (Super Admin), `editor`, `viewer`

### Important RBAC Rules

- **tRPC middleware**: use `requirePermission("blog.posts.create")` in tRPC routers
- **NestJS guard**: use `@RequirePermission("blog.posts.create")` decorator in NestJS controllers
- Permission checks go in `page.tsx` (NOT `layout.tsx`) for Next.js pages

## When working with Blog module

### Post statuses

| Status | Description |
|--------|-------------|
| `DRAFT` | Default. Only visible to author and admins |
| `PENDING` | Submitted for review |
| `PUBLISHED` | Publicly visible. `publishedAt` is set |
| `ARCHIVED` | Soft-deleted, not visible publicly |

### Category tree

Categories support parent-child relationships via self-referencing `parentId`. Use recursive queries or adjacency list pattern for tree rendering.

### Slug generation

Slugs are auto-generated from titles using `slugify()` with Vietnamese character support (`viết bài` → `viet-bai`). Slugs must be unique per entity type.

## When you need product or codebase context

### Monorepo Structure

The whole repository is a Turborepo monorepo. The main admin web app is in `apps/web`. The REST API for mobile/extension is in `apps/api`.

### Package Scope

All internal packages use the `@ecom/` scope:
- `@ecom/prisma` — Prisma client + schema
- `@ecom/trpc` — tRPC routers
- `@ecom/features` — Business logic
- `@ecom/ui` — UI components
- `@ecom/lib` — Shared utilities
- `@ecom/i18n` — Translations
- `@ecom/types` — Shared types
- `@ecom/config` — Configuration
- `@ecom/emails` — Email templates
- `@ecom/platform-libraries` — Re-exports for NestJS API

### Local Development Database

Default Docker PostgreSQL credentials:
```
Host: localhost
Port: 5432
Database: ecom
User: cms
Password: (from .env DB_PASSWORD)
```

Connect via psql:
```bash
psql "postgresql://cms:password@localhost:5432/ecom"
```

### Logging Levels

Control logging verbosity by setting `LOG_LEVEL` in .env:
- `debug` — All logs
- `info` — Info, warn, error
- `warn` — Warn, error only
- `error` — Error only

### Default Dev Credentials

After seeding (`yarn db:seed`):
- `admin@ecom.com` / `password123` (Super Admin — role: `admin`, all 58 permissions)

### UI Component Locations

- Login page: `apps/admin/src/app/(auth)/login/page.tsx`
- Dashboard: `apps/admin/src/app/(main)/page.tsx`
- Blog posts: `apps/admin/src/app/(main)/posts/page.tsx`
- Users: `apps/admin/src/app/(main)/users/page.tsx`
- Customers: `apps/admin/src/app/(main)/customers/page.tsx`
- Roles: `apps/admin/src/app/(main)/settings/roles/page.tsx`

### DataTable

For table/list views, use the shared `DataTable` component from `@ecom/ui/components/data-table`. It supports:
- Server-side pagination
- Column sorting
- Filtering
- Row selection / bulk actions
- Column visibility toggles

### i18n

All UI strings must exist in both locale files:
- `packages/i18n/locales/en/common.json`
- `packages/i18n/locales/vi/common.json`

Use `useTranslations()` hook from `next-intl` in components.
