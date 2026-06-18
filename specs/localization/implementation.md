# Localization (i18n) Implementation

## Status: complete

## Completed

### Phase 1: Schema + Language Service Layer
- [x] Enhanced `Language` model — added `locale`, `code`, `isRtl` fields
- [x] Added `LanguageMeta` model — polymorphic origin tracking
- [x] Added `MenuItemTranslation` model
- [x] Created `LanguageRepository` — data access with `select` (no `include`)
- [x] Created `LanguageMetaRepository` — polymorphic origin CRUD
- [x] Created `LanguageService` — business logic + invariant enforcement
- [x] Created `LanguageLocaleCache` — in-memory TTL cache for `findActive()` and `findDefault()`

### Phase 2: tRPC Language Router + Seed Data
- [x] Created `viewer.languages` tRPC router — full CRUD + setDefault + getRelatedItems
- [x] Created `viewer.translations` tRPC router — get/list/save/delete + batchStatus
- [x] Added seed data for default languages (en, vi, zh)
- [x] Created `worldLanguages.ts` constant (~180 ISO 639-1 languages for picker)

### Phase 3: Language Settings Admin UI
- [x] Created `/settings/languages` page — language CRUD with predefined picker
- [x] Added i18n strings to `en/common.json` and `vi/common.json`

### Phase 4: Admin Content Language Switcher
- [x] Created `LanguageSwitcher` component (`@ecom/ui/components/language-switcher.tsx`)
- [x] Created `useLanguageSwitcher` hook — URL state (`?ref_lang=`) management
- [x] Integrated into Post edit form — hides sidebar in translation mode
- [x] Integrated into Category edit form
- [x] Added `translationMode` prop to CategoryForm and TagForm

### Phase 5: Translation-Aware API + Language Column
- [x] Created `TranslationOverlay` — batch overlay for posts, categories, tags, pages, menu items
- [x] Created `TranslationStatusIndicator` — flag icons with batch query support
- [x] Wired into posts, categories, tags, pages list pages
- [x] Added `X-Locale` header forwarding from both Admin and Customer tRPC clients
- [x] Created `findPostByTranslatedSlug()` in TranslationOverlay

### Phase 6: Customer App SEO & Localized Routing
- [x] Created i18n middleware — locale detection from URL → cookie → Accept-Language → default
- [x] Root layout dynamically sets `<html lang>` from params
- [x] Created `HrefLangTags` component — canonical URL + og:locale + hreflang alternates
- [x] Multi-language sitemap with hreflang alternates
- [x] Customer `LanguageSwitcher` component with flag/label display + NEXT_LOCALE cookie
- [x] Integrated into CustomerLayout header (desktop + mobile)

### Phase 7: Advanced Features
- [x] Locale-aware RSS feed (`/feed.xml?lang=en`)
- [x] i18n error pages (error.tsx, not-found.tsx)
- [x] Accept-Language detection + NEXT_LOCALE cookie persistence
- [x] Translation CSV export/import service

### Page/Menu Translation
- [x] `overlayPageTranslation()` / `overlayPageTranslations()` in TranslationOverlay
- [x] `overlayMenuItemTranslations()` in TranslationOverlay
- [x] `PageTranslationPanel` component with language tabs

### Verification
- [x] Type check: 16/16 packages pass
- [x] Biome lint: 411 files, 0 errors, 0 warnings
- [x] All 7 translation tables have `onDelete: Cascade`

## Blocked

(none)

## Next Steps

(none — feature complete)

## Session Notes

- Implemented across 3 rounds of optimization + 1 round of advanced features
- All non-null assertions replaced with safe patterns
- All cognitive complexity warnings addressed with justifications
