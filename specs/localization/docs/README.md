# Localization (i18n) — Documentation

## Feature Overview

Ecom's localization system enables multilingual content management for all CMS entities. It provides:

- **Language management** — Add/remove/configure supported languages from admin settings
- **Content translation** — Translate posts, pages, categories, tags, and menu items via inline editors
- **Translation tracking** — Visual indicators showing which content has been translated
- **Locale-aware public site** — Locale-prefixed URLs, automatic language detection, and SEO optimization
- **Offline translation workflow** — CSV export/import for external translators

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Admin App                                   │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ Language Settings│  │ Language Switcher │  │ Translation Status │  │
│  │  /settings/langs │  │ (Edit form tabs) │  │  (List table flags)│  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬──────────┘  │
│           │                     │                      │             │
│           ▼                     ▼                      ▼             │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    tRPC API Layer                               │  │
│  │  viewer.languages.*          viewer.translations.*              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│           │                     │                      │             │
│           ▼                     ▼                      ▼             │
│  ┌──────────────┐   ┌──────────────────┐   ┌───────────────────┐   │
│  │LanguageService│   │TranslationService│   │TranslationOverlay │   │
│  │+ LocaleCache │   │+ CsvService      │   │(batch merge)      │   │
│  └──────────────┘   └──────────────────┘   └───────────────────┘   │
│           │                     │                      │             │
│           ▼                     ▼                      ▼             │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Prisma / PostgreSQL                          │  │
│  │  languages  language_meta  *_translations (7 tables)           │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Customer App                                  │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │
│  │LanguageSwitcher│ │ i18n Middleware│ │ HrefLangTags + SEO Meta  │ │
│  │(cookie persist)│ │(locale detect)│  │(canonical + og:locale)   │ │
│  └──────────────┘  └──────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## How to Use

### 1. Managing Languages

**Path**: Admin → Settings → Languages

1. Open the Language Settings page
2. Use the "Add Language" form to pick from ~180 predefined languages
3. Fields auto-fill based on selection (name, locale, code, flag)
4. Toggle RTL for right-to-left languages (Arabic, Hebrew, etc.)
5. Set one language as default (★ icon) — this is the primary content language
6. Drag to reorder or use the "Order" field

### 2. Translating Content

**Path**: Admin → Posts/Pages/Categories → Edit → Language Tabs

1. Open any content item in edit mode
2. Click the language tabs above the form (e.g., 🇺🇸 English | 🇻🇳 Tiếng Việt)
3. When editing a non-default language:
   - Only translatable fields are shown (title, slug, content, excerpt)
   - Non-translatable fields (categories, tags, status) are hidden
   - A banner indicates which language you're editing
4. Click "Save Translation" to save
5. The URL updates to include `?ref_lang=vi` — this is bookmarkable

### 3. Tracking Translation Coverage

**Path**: Admin → Posts/Pages/Categories/Tags → List View

Each row in the data table shows flag icons indicating translation status:
- ✅ Green flag = translation exists for that language
- ⬜ Empty = no translation yet

The `TranslationStatusIndicator` uses a batch query (single DB call for up to 100 entities) to avoid N+1 performance issues.

### 4. Inline Page Translation

**Path**: Admin → Pages → Click a page → Translation Panel

The page detail view includes a `PageTranslationPanel` at the bottom:
1. Click a language tab to switch
2. Edit the translated title and content inline
3. Save without leaving the page

### 5. CSV Export/Import

**Exporting translations**:
1. Go to Language Settings
2. Select an entity type (Post, Category, Page, Tag) and language
3. Click "Export CSV"
4. Open the downloaded `.csv` in Excel/Google Sheets

**CSV format**:
```csv
id,field,original,translated
1,title,"Hello World","Xin chào thế giới"
1,excerpt,"A summary","Tóm tắt"
2,title,"Another Post",""
```

**Importing translations**:
1. Fill in the `translated` column in the CSV
2. Go to Language Settings → click "Import CSV"
3. Upload the file → preview changes → confirm

### 6. Customer Site Language

The customer-facing site uses locale-prefixed URLs:
- `/vi/blog/bai-viet` → Vietnamese
- `/en/blog/article` → English
- `/blog/article` → Redirects to default locale (`/vi/blog/article`)

**Language detection** for first-time visitors:
1. Check `NEXT_LOCALE` cookie (returning visitors)
2. Parse `Accept-Language` header (browser preference)
3. Fall back to default locale (`vi`)

**Language switcher**: A dropdown in the site header that:
- Switches the URL locale prefix
- Sets a `NEXT_LOCALE` cookie (persists for 365 days)

---

## Configuration

### Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` | Customer app base URL (used for hreflang, sitemap, RSS) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | API base URL |

### Supported Locales

Defined in `apps/customer/src/lib/i18n.ts`:

```typescript
export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export const DEFAULT_LOCALE = "vi" as const;
```

And mirrored in `apps/customer/src/middleware.ts` (Edge Runtime can't import from lib):

```typescript
const SUPPORTED_LOCALES = ["vi", "en"];
const DEFAULT_LOCALE = "vi";
```

> **Important**: When adding a new locale, update both files + add the language in admin Settings.

### Adding a New Translatable Model

See [prompts.md](prompts.md) → "Add a New Translatable Model" for step-by-step instructions.

---

## File Map

### Backend (packages)

| Path | Description |
| --- | --- |
| [LanguageRepository.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/features/language/repositories/LanguageRepository.ts) | Language CRUD data access |
| [LanguageMetaRepository.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/features/language/repositories/LanguageMetaRepository.ts) | Polymorphic origin tracking |
| [LanguageService.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/features/language/services/LanguageService.ts) | Language business logic |
| [LanguageLocaleCache.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/features/language/services/LanguageLocaleCache.ts) | In-memory TTL cache |
| [worldLanguages.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/features/language/constants/worldLanguages.ts) | ~180 predefined languages |
| [TranslationRepository.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/features/translation/repositories/TranslationRepository.ts) | Translation CRUD for all entity types |
| [TranslationService.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/features/translation/services/TranslationService.ts) | Translation business logic |
| [TranslationOverlay.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/features/translation/services/TranslationOverlay.ts) | Batch translation merging for API responses |
| [TranslationCsvService.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/features/translation/services/TranslationCsvService.ts) | CSV export/import for offline translation |

### tRPC Routers

| Path | Description |
| --- | --- |
| [languages/_router.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/trpc/server/routers/viewer/languages/_router.ts) | Language CRUD router |
| [languages.handler.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/trpc/server/routers/viewer/languages/procedures/languages.handler.ts) | Language procedure handlers |
| [translations/_router.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/trpc/server/routers/viewer/translations/_router.ts) | Translation CRUD router |
| [translations.handler.ts](file:///Users/tuandang/Data/FlashShip/ecom/packages/trpc/server/routers/viewer/translations/procedures/translations.handler.ts) | Translation procedure handlers |

### Admin UI

| Path | Description |
| --- | --- |
| [settings/languages/page.tsx](file:///Users/tuandang/Data/FlashShip/ecom/apps/admin/src/app/(main)/settings/languages/page.tsx) | Language Settings page |
| [language-switcher.tsx](file:///Users/tuandang/Data/FlashShip/ecom/packages/ui/components/language-switcher.tsx) | Reusable language tab component |
| [useLanguageSwitcher.ts](file:///Users/tuandang/Data/FlashShip/ecom/apps/admin/src/hooks/useLanguageSwitcher.ts) | URL-state language switcher hook |
| [TranslationStatusIndicator.tsx](file:///Users/tuandang/Data/FlashShip/ecom/apps/admin/src/components/translation/TranslationStatusIndicator.tsx) | Flag icons for translation status |
| [PageTranslationPanel.tsx](file:///Users/tuandang/Data/FlashShip/ecom/apps/admin/src/components/translation/PageTranslationPanel.tsx) | Inline page translation editor |

### Customer App

| Path | Description |
| --- | --- |
| [middleware.ts](file:///Users/tuandang/Data/FlashShip/ecom/apps/customer/src/middleware.ts) | i18n locale detection middleware |
| [i18n.ts](file:///Users/tuandang/Data/FlashShip/ecom/apps/customer/src/lib/i18n.ts) | Locale constants + hreflang helpers |
| [LanguageSwitcher.tsx](file:///Users/tuandang/Data/FlashShip/ecom/apps/customer/src/components/LanguageSwitcher.tsx) | Customer language dropdown |
| [HrefLangTags.tsx](file:///Users/tuandang/Data/FlashShip/ecom/apps/customer/src/components/HrefLangTags.tsx) | SEO hreflang + og:locale meta tags |
| [feed.xml/route.ts](file:///Users/tuandang/Data/FlashShip/ecom/apps/customer/src/app/feed.xml/route.ts) | Locale-aware RSS feed |
| [error.tsx](file:///Users/tuandang/Data/FlashShip/ecom/apps/customer/src/app/error.tsx) | i18n error page |
| [not-found.tsx](file:///Users/tuandang/Data/FlashShip/ecom/apps/customer/src/app/not-found.tsx) | i18n 404 page |
| [sitemap.ts](file:///Users/tuandang/Data/FlashShip/ecom/apps/customer/src/app/sitemap.ts) | Multi-locale sitemap |

### Database Schema

| Model | Table | Purpose |
| --- | --- | --- |
| `Language` | `languages` | Supported languages registry |
| `LanguageMeta` | `language_meta` | Polymorphic origin tracking |
| `PostTranslation` | `post_translations` | Post field translations |
| `CategoryTranslation` | `category_translations` | Category field translations |
| `TagTranslation` | `tag_translations` | Tag field translations |
| `PageTranslation` | `page_translations` | Page field translations |
| `SlugTranslation` | `slug_translations` | SEO slug translations |
| `MenuItemTranslation` | `menu_item_translations` | Menu item label translations |
| `AdminMenuItemTranslation` | `admin_menu_item_translations` | Admin menu translations |

---

## Common Use Cases

### Adding a new language (e.g., Chinese)

1. Go to Admin → Settings → Languages
2. Select "中文 (中国)" from the language picker
3. Code auto-fills to `zh_CN`, locale to `zh`, flag to `cn`
4. Click "Add Language"
5. Update `SUPPORTED_LOCALES` in both `apps/customer/src/lib/i18n.ts` and `apps/customer/src/middleware.ts`
6. Add Chinese locale labels to `LanguageSwitcher.tsx` LOCALE_LABELS

### Translating a blog post

1. Go to Admin → Posts → select a post → Edit
2. Click the 🇻🇳 Tiếng Việt tab
3. The form switches to translation mode — only title, slug, content, excerpt are editable
4. Enter the Vietnamese translation
5. Click "Save Translation"
6. Return to the post list — the flag column now shows ✅ for Vietnamese

### Checking translation coverage

1. Go to Admin → Posts list
2. Look at the "Languages" column — each row shows flag icons
3. ✅ = translated, ⬜ = not translated
4. Click a flag to jump to that language's edit form

### Serving localized content to customers

The customer site automatically serves content in the requested locale:
- URL `/vi/blog/hello` → serves `PostTranslation` where `langCode = "vi"`
- If no translation exists, falls back to the default language content
- `TranslationOverlay` handles the merge transparently
