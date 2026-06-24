# Ecom Development Guide for AI Agents

You are a senior Ecom engineer working in a Yarn/Turbo monorepo. You prioritize type safety, security, and small, reviewable diffs.

## Do

- Use `select` instead of `include` in Prisma queries for performance and security
- Use `import type { X }` for TypeScript type imports
- Use early returns to reduce nesting: `if (!user) return null;`
- Use `ErrorWithCode` for errors in non-tRPC files (services, repositories, utilities); use `TRPCError` only in tRPC routers; use NestJS `HttpException` subclasses only in NestJS controllers
- Use conventional commits: `feat:`, `fix:`, `refactor:`
- Create PRs in draft mode by default
- Run `yarn type-check:ci --force` before concluding CI failures are unrelated to your changes
- Import directly from source files, not barrel files (e.g., `@ecom/ui/components/button` not `@ecom/ui`)
- Add translations to `packages/i18n/locales/en/common.json` and `packages/i18n/locales/vi/common.json` for all UI strings
- Use `date-fns` or native `Date` instead of Day.js when timezone awareness isn't needed
- Put permission checks in `page.tsx`, never in `layout.tsx`
- Use `ast-grep` for searching if available; otherwise use `rg` (ripgrep), then fall back to `grep`
- Use Biome for formatting and linting
- Only add code comments that explain **why**, not **what** — see [code comment guidelines](agents/rules/quality-code-comments.md)
- Always declare new environment variables in the app's central `env.ts` (using Zod) and retrieve them via NestJS `ConfigService` or Next.js validated config helper (see [environment variables guidelines](agents/rules/patterns-environment-variables.md))


## Don't

- Never use `as any` - use proper type-safe solutions instead
- Never expose `password`, `hashedKey`, `tokenHash`, or `refreshTokenHash` fields in API responses or queries
- Never commit secrets or API keys
- Never put business logic in repositories - that belongs in Services
- Never use barrel imports from index.ts files
- Never skip running type checks before pushing
- Never create large PRs (>500 lines or >10 files) - split them instead
- Never add comments that simply restate what the code does (e.g., `// Get the user` above a `getUser()` call)
- Never import Prisma directly in Services - use Repositories via DI
- Never access `process.env` directly outside configuration bootstrapping files

## PR Size Guidelines

Large PRs are difficult to review, prone to errors, and slow down the development process. Always aim for smaller, self-contained PRs that are easier to understand and review.

### Size Limits

- **Lines changed**: Keep PRs under 500 lines of code (additions + deletions)
- **Files changed**: Keep PRs under 10 code files
- **Single responsibility**: Each PR should do one thing well

**Note**: These limits apply to code files only. Non-code files like documentation (README.md, CHANGELOG.md), lock files (yarn.lock, package-lock.json), and auto-generated files are excluded from the count.

### How to Split Large Changes

When a task requires extensive changes, break it into multiple PRs:

1. **By layer**: Separate database/schema changes, backend logic, and frontend UI into different PRs
2. **By feature component**: Split a feature into its constituent parts (e.g., API endpoint PR, then UI PR, then integration PR)
3. **By refactor vs feature**: Do preparatory refactoring in a separate PR before adding new functionality
4. **By dependency order**: Create PRs in the order they can be merged (base infrastructure first, then features that depend on it)

### Examples of Good PR Splits

**Instead of one large "Add blog notifications" PR:**
- PR 1: Add notification preferences schema and migration
- PR 2: Add notification service and API endpoints
- PR 3: Add notification UI components
- PR 4: Integrate notifications into blog publish flow

**Instead of one large "Add media management" PR:**
- PR 1: Add media schema and storage adapter interface
- PR 2: Add upload service and tRPC router
- PR 3: Add media manager UI component
- PR 4: Integrate media picker into blog post editor

### Benefits of Smaller PRs

- Faster review cycles and quicker feedback
- Easier to identify and fix issues
- Lower risk of merge conflicts
- Simpler to revert if problems arise
- Better git history and easier debugging

## Commands

See [agents/commands.md](agents/commands.md) for full reference. Key commands:

```bash
yarn dev                     # Start both web + api dev servers
yarn type-check:ci --force   # Type check (always run before pushing)
yarn biome check --write .   # Lint and format
TZ=UTC yarn test             # Run unit tests
yarn prisma generate         # Regenerate types after schema changes
yarn prisma migrate dev      # Run migrations in development
yarn docker:up               # Start PostgreSQL + Redis via Docker
```


## Boundaries

### Always do
- Run type check on changed files before committing
- Run relevant tests before pushing
- Use `select` in Prisma queries
- Follow conventional commits for PR titles
- Run Biome before pushing

### Ask first
- Adding new dependencies
- Schema changes to `packages/prisma/schema.prisma`
- Changes affecting multiple packages
- Deleting files
- Running full build or E2E suites

### Never do
- Commit secrets, API keys, or `.env` files
- Expose sensitive fields (`password`, `hashedKey`, `tokenHash`) in any query
- Use `as any` type casting
- Force push or rebase shared branches
- Import Prisma directly in service files

## Project Structure

```
apps/web/                    # Next.js 16 Admin CMS (App Router)
apps/api/                    # NestJS REST API (Mobile, Extension, Public)
packages/prisma/             # Database schema (schema.prisma) and migrations
packages/trpc/               # tRPC API layer (routers in server/routers/)
packages/features/           # Feature-specific business logic (vertical slices)
packages/ui/                 # Shared UI components (Radix + Tailwind)
packages/lib/                # Shared utilities (errors, crypto, jwt)
packages/i18n/               # Translations (en, vi)
packages/types/              # Shared TypeScript types
packages/config/             # Shared configuration
packages/emails/             # Email templates
packages/tsconfig/           # Shared TS configs
```

### Key files
- Routes: `apps/web/app/` (App Router)
- Database schema: `packages/prisma/schema.prisma`
- tRPC routers: `packages/trpc/server/routers/`
- NestJS controllers: `apps/api/src/modules/`
- Translations (EN): `packages/i18n/locales/en/common.json`
- Translations (VI): `packages/i18n/locales/vi/common.json`
- Auth strategy: `apps/api/src/modules/auth/strategies/api-auth.strategy.ts`

## Tech Stack

- **Framework (Web)**: Next.js 16 (App Router)
- **Framework (API)**: NestJS 11 (REST API v2)
- **Language**: TypeScript 5 (strict)
- **Database**: PostgreSQL 18 with Prisma ORM v6
- **API (Internal)**: tRPC v11 for type-safe APIs (Web ↔ Server)
- **API (External)**: NestJS REST + Swagger (Mobile, Extension, Public)
- **Auth (Web)**: NextAuth.js v5 (session/cookie)
- **Auth (API)**: JWT access/refresh tokens + API keys (`ecom_` prefix)
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI + shadcn/ui pattern
- **State**: Zustand v5 _(planned)_
- **Forms**: React Hook Form + Zod v3 _(RHF planned)_
- **Data Fetching**: TanStack React Query v5
- **i18n**: next-intl v4
- **Testing**: Vitest (unit), Playwright (E2E) _(planned)_
- **Linting**: Biome v2
- **Monorepo**: Turborepo v2 + Yarn v4
- **Deployment**: Docker on VPS

## Dual Auth Architecture

Ecom supports multiple client types with different auth methods:

| Auth Method | Client | Transport |
|------------|--------|-----------|
| **NextAuth Session** (cookie) | Admin Web | HTTP Cookie (httpOnly) |
| **API Key** (`Bearer ecom_xxx`) | Scripts, CI/CD | `Authorization` header |
| **JWT Access Token** | Mobile, Extension | `Authorization` header |
| **JWT Refresh Token** | Mobile, Extension | Request body |

Auth flow in NestJS `ApiAuthStrategy`:
```
Request → Has Bearer token?
├── Token starts with "ecom_"? → API Key strategy
├── Else? → JWT Access Token strategy
└── No Bearer? → NextAuth cookie fallback
```

## Code Examples

### Good error handling

```typescript
// In services/repositories — use ErrorWithCode
import { ErrorCode } from "@ecom/lib/errorCodes";
import { ErrorWithCode } from "@ecom/lib/errors";

throw new ErrorWithCode(ErrorCode.PostNotFound, `Post ${postId} not found`);
throw ErrorWithCode.Factory.Forbidden("You don't have permission to edit this post");

// In tRPC routers — use TRPCError
import { TRPCError } from "@trpc/server";

throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });

// In NestJS controllers — use HttpException subclasses
import { NotFoundException } from "@nestjs/common";

throw new NotFoundException(`Post ${postId} not found`);
```

### Good Prisma query

```typescript
// Good - Use select for performance and security
const user = await prisma.user.findFirst({
  select: {
    id: true,
    name: true,
    email: true,
    roles: {
      select: {
        role: {
          select: { name: true, permissions: true }
        }
      }
    }
  }
});

// Bad - Include fetches all fields including sensitive ones
const user = await prisma.user.findFirst({
  include: { password: true, apiKeys: true }
});
```

### Good imports

```typescript
// Good - Type imports and direct paths
import type { User } from "@prisma/client";
import { Button } from "@ecom/ui/components/button";
import { PostService } from "@ecom/features/blog/services/PostService";

// Bad - Regular import for types, barrel imports
import { User } from "@prisma/client";
import { Button } from "@ecom/ui";
import { PostService } from "@ecom/features";
```

### Good repository pattern

```typescript
// Repository — data access only, no business logic
export class PostRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: number) {
    return this.prisma.post.findUnique({
      where: { id },
      select: { id: true, title: true, slug: true, status: true, authorId: true }
    });
  }

  async findByIdIncludeCategories(id: number) {
    return this.prisma.post.findUnique({
      where: { id },
      select: {
        id: true, title: true, slug: true,
        categories: { select: { category: { select: { id: true, name: true } } } }
      }
    });
  }
}

// Service — business logic here
export class PostService {
  constructor(private deps: IPostServiceDeps) {}

  async publishPost(postId: number, userId: number) {
    const post = await this.deps.postRepo.findById(postId);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");
    if (post.authorId !== userId) throw ErrorWithCode.Factory.Forbidden("Not the author");
    return this.deps.postRepo.updateStatus(postId, "PUBLISHED");
  }
}
```

### API Imports (apps/api)

When importing from `@ecom/features` or `@ecom/trpc` into `apps/api`, **do not import directly** because the API app's `tsconfig.json` doesn't have path mappings for these modules.

Instead, re-export from `packages/platform/libraries/index.ts` and import from `@ecom/platform-libraries`:

```typescript
// Step 1: In packages/platform/libraries/index.ts, add the export
export { PostService } from "@ecom/features/blog/services/PostService";

// Step 2: In apps/api, import from platform-libraries
import { PostService } from "@ecom/platform-libraries";

// Bad - Direct import causes module not found error in apps/api
import { PostService } from "@ecom/features/blog/services/PostService";
```

## PR Checklist

- [ ] Title follows conventional commits: `feat(scope): description`
- [ ] Type check passes: `yarn type-check:ci --force`
- [ ] Lint passes: `yarn biome check --write .`
- [ ] Relevant tests pass
- [ ] Diff is small and focused (<500 lines, <10 files)
- [ ] No secrets or API keys committed
- [ ] No sensitive fields exposed in Prisma queries
- [ ] UI strings added to translation files (en + vi)
- [ ] Created as draft PR

## When Stuck

- Ask a clarifying question before making large speculative changes
- Propose a short plan for complex tasks
- Open a draft PR with notes if unsure about approach
- Fix type errors before test failures - they're often the root cause
- Run `yarn prisma generate` if you see missing enum/type errors
- Run `yarn docker:up` if database connection fails

## Spec-Driven Development (Opt-In)

For complex features, you can use spec-driven development when explicitly requested.

**To enable:** Tell the AI "use spec-driven development" or "follow the spec workflow"

See [SPEC-WORKFLOW.md](SPEC-WORKFLOW.md) for the full workflow documentation.

## Extended Documentation

For detailed information, see the `agents/` directory:

- **[agents/README.md](agents/README.md)** - Rules index and architecture overview
- **[agents/rules/](agents/rules/)** - Modular engineering rules
- **[agents/commands.md](agents/commands.md)** - Complete command reference
- **[agents/knowledge-base.md](agents/knowledge-base.md)** - Domain knowledge and business rules
