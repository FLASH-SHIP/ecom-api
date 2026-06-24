# Ecom — Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Clients                          │
├────────────┬─────────────┬────────────┬─────────────────┤
│  Web CMS   │  Mobile App │  Extension │   Scripts/CI    │
│  (Next.js) │  (RN/Expo)  │  (Chrome)  │                 │
├────────────┤─────────────┴────────────┴─────────────────┤
│   tRPC     │              REST API v2                   │
│  (cookie)  │        (JWT / API Key)                     │
├────────────┴────────────────────────────────────────────┤
│               packages/trpc (Routers)                   │
│              ┌──────────────────────┐                    │
│              │ Procedure Handlers   │                    │
│              │ (thin, no logic)     │                    │
│              └──────────┬───────────┘                    │
│                         │                                │
│              ┌──────────▼───────────┐                    │
│              │   DI Containers      │                    │
│              │ (lazy singletons)    │                    │
│              └──────────┬───────────┘                    │
│                         │                                │
│              ┌──────────▼───────────┐                    │
│              │ packages/features    │                    │
│              │  Services (logic)    │                    │
│              │  Repositories (data) │                    │
│              └──────────┬───────────┘                    │
│                         │                                │
│              ┌──────────▼───────────┐                    │
│              │  packages/prisma     │                    │
│              │  (PostgreSQL 18)     │                    │
│              └──────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## Package Dependency Graph

```
apps/web ──────────► packages/trpc ──────► packages/features
    │                     │                      │
    │                     ▼                      ▼
    ├───────────► packages/ui          packages/prisma
    │                                        │
    ├───────────► packages/i18n              ▼
    │                                   PostgreSQL
    └───────────► packages/lib
                       ▲
apps/api ─────────────┘
    │
    └───────────► packages/features
```

## Vertical Slice Architecture

Mỗi feature là một vertical slice tự chứa:

```
packages/features/
└── auth/                          # Feature: Authentication
    ├── services/
    │   ├── AuthService.ts         # Business logic (Web login)
    │   └── ApiAuthService.ts      # Business logic (API auth)
    └── repositories/
        ├── UserRepository.ts      # Data access
        └── ApiKeyRepository.ts    # Data access

packages/features/di/containers/   # Dependency injection
    └── AuthService.ts             # Wires Service + Repository
```

**Rules:**
- **Service** = business logic, throws `ErrorWithCode`
- **Repository** = data access only, uses Prisma `select` (never `include`)
- **DI Container** = lazy singleton, wires dependencies
- Services never import Prisma directly, always through Repositories

## Request Flow

### REST API v2 (NestJS)

```
HTTP Request
  → NestJS Controller
    → ApiAuthGuard (authenticates Bearer token)
      → Token starts with "ecom_"? → API Key strategy
      → Otherwise? → JWT strategy
    → Controller method
      → DI Container → Service → Repository → Prisma → DB
    → HTTP Response
```

### tRPC (Web CMS)

```
HTTP Request (from Next.js)
  → tRPC Handler (/api/trpc/[trpc])
    → createContext (extracts NextAuth session)
    → authedProcedure (enforces login)
      → Procedure Handler
        → DI Container → Service → Repository → Prisma → DB
    → tRPC Response (superjson)
```

## Auth Architecture

```
                    ┌──────────────┐
                    │ Bearer Token │
                    └──────┬───────┘
                           │
              ┌────────────▼────────────┐
              │  Starts with "ecom_" ?   │
              └────┬───────────────┬────┘
                   │ YES           │ NO
          ┌────────▼─────┐  ┌─────▼────────┐
          │  API Key     │  │  JWT Access   │
          │  Strategy    │  │  Token        │
          │              │  │  Strategy     │
          │ SHA-256 hash │  │              │
          │ → DB lookup  │  │ verify(token)│
          │ → check exp  │  │ → DB lookup  │
          │ → check user │  │ → check user │
          └──────────────┘  └──────────────┘
```

| Method | Client | TTL | Storage |
|--------|--------|-----|---------|
| NextAuth Session | Web CMS | ~30 days | Cookie (httpOnly) |
| JWT Access Token | Mobile, Extension | 15 min | Memory / SecureStore |
| JWT Refresh Token | Mobile, Extension | 30 days | SecureStore |
| API Key (`ecom_xxx`) | Scripts, CI/CD | No expiry* | Environment variable |

## RBAC Model

```
User ──M:N──► Role ──M:N──► Permission

Permission format: "{module}.{resource}.{action}"
Examples:
  - blog.posts.create
  - blog.posts.edit
  - blog.posts.delete
  - users.manage
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo tool | Turborepo + Yarn 4 | Fast builds, native workspaces |
| ORM | Prisma v6 | Type-safe, good migrations |
| Internal API | tRPC v11 | End-to-end type safety with Next.js |
| External API | NestJS | Swagger, guards, decorators for REST |
| Auth (Web) | NextAuth v5 | Built-in session management |
| Auth (API) | Custom JWT + API Key | Flexible for multiple clients |
| Linting | Biome v2 | Fast, replaces ESLint + Prettier |
| DI pattern | Lazy singletons | Simple, no framework dependency |
| Error handling | ErrorWithCode | Machine-readable codes across layers |
