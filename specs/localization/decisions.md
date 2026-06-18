# Localization Decisions

## ADR-001: Two-Layer Translation Architecture (Botble-inspired)

### Context

Need to support multilingual DB content. Two main approaches:
1. **Per-field translation tables** (e.g., `post_translations`) — used for content models with specific translatable fields
2. **Polymorphic origin tracking** (`LanguageMeta`) — used for models that need full duplication per language (Menu, MenuItem)

### Options Considered

1. **Single approach (per-field only)** — simpler but doesn't handle Menu duplication well
2. **Botble hybrid approach** — per-field tables for content + LanguageMeta for structure entities
3. **JSON column translations** — flexible but poor query performance and no referential integrity

### Decision

Adopted Botble's hybrid approach (Option 2):
- **Layer 2 (per-field)**: Post, Page, Category, Tag, Slug, MenuItem — companion `*_translations` tables
- **Layer 1 (LanguageMeta)**: Available for Menu/Widget if full entity duplication is needed in the future

### Consequences

- 7 translation tables + 1 LanguageMeta table
- All use `onDelete: Cascade` for automatic cleanup
- TranslationOverlay service provides a unified API for merging translations into responses

---

## ADR-002: API-Level Translation Overlay vs ORM-Level

### Context

Need to decide where translation merging happens — at the ORM level (interceptors/middleware) or at the API response level.

### Options Considered

1. **ORM-level** (Prisma middleware) — automatic but harder to debug, breaks typing
2. **API-level overlay** (`TranslationOverlay` service) — explicit, type-safe, batch-friendly

### Decision

API-level overlay (Option 2). The `TranslationOverlay` module provides explicit `overlayPostTranslation()`, `overlayPostTranslations()`, etc., functions that are called in tRPC handlers.

### Consequences

- Explicit control over when and where translations are applied
- Batch-optimized (single DB query for N entities)
- Type-safe — returns `T & { _translatedFrom?: string }`
- Handlers must explicitly call overlay functions (not automatic)

---

## ADR-003: URL-State Language Switcher (not React State)

### Context

Admin edit forms need a language switcher for managing translations. Where should the active translation language state live?

### Options Considered

1. **React state** — simple but lost on page refresh, not linkable
2. **URL query parameter** (`?ref_lang=vi`) — linkable, shareable, survives refresh

### Decision

URL state via `?ref_lang=` query parameter (Option 2), matching Botble's pattern.

### Consequences

- Translation editing state is bookmarkable and shareable
- `useLanguageSwitcher` hook manages URL sync via Next.js router
- Form handlers read `ref_lang` from URL to determine save target

---

## ADR-004: In-Memory Cache for Language Queries

### Context

`findActive()` and `findDefault()` are called on every request through TranslationOverlay. These rarely change.

### Options Considered

1. **No cache** — always query DB
2. **Redis cache** — distributed but adds latency + complexity
3. **In-memory TTL cache** — fastest, sufficient for single-instance deployments

### Decision

In-memory TTL cache (`LanguageLocaleCache` singleton) with automatic invalidation on CRUD operations.

### Consequences

- Near-zero latency for language lookups
- Auto-invalidated when languages are created/updated/deleted
- Not suitable for multi-instance deployments without sticky sessions (can add Redis layer later)

---

## ADR-005: Customer App Locale Detection Priority

### Context

Need to determine the user's preferred language when they visit the customer site for the first time or return.

### Decision

Priority order:
1. **URL path prefix** (`/en/blog/...`) — highest, explicit
2. **`NEXT_LOCALE` cookie** — returning visitor's saved preference
3. **`Accept-Language` header** — browser's language setting for first-time visitors
4. **Default locale** (`vi`) — fallback

### Consequences

- First-time visitors get language-matched content from browser settings
- Language preference persists across sessions via cookie (365-day max-age)
- All paths are locale-prefixed for SEO clarity
