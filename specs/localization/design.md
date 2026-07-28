# Localization (i18n) Design

## Overview

Ecom implements a comprehensive two-layer localization system inspired by Botble CMS, supporting multilingual DB content across all content models (Post, Page, Category, Tag, Menu, Slug). The system provides admin-side language management, content translation workflows, translation-aware public APIs, and customer-facing locale routing.

## Problem Statement

As an e-commerce CMS serving international markets, Ecom needs to support content in multiple languages while maintaining a single content management workflow. Content creators need to manage translations efficiently, and the public-facing site needs to serve locale-appropriate content with proper SEO.

## User Stories

- As an **admin**, I want to manage supported languages (add, remove, set default) so that the CMS supports the markets I serve
- As a **content editor**, I want to translate posts, pages, categories, and tags inline so that I can manage all language versions from a single interface
- As a **content editor**, I want to see which content items have been translated so that I can track translation coverage
- As a **translator**, I want to export/import translations as CSV so that I can work offline with spreadsheet tools
- As a **customer**, I want to browse the site in my preferred language so that I can read content I understand
- As a **customer**, I want the site to remember my language preference so that I don't have to switch every visit
- As a **search engine**, I want proper `hreflang` tags and localized URLs so that the correct language version is indexed

## Technical Design

### Database Schema

```mermaid
erDiagram
    Language {
        int id PK
        string name "English, Tiếng Việt"
        string locale UK "en, vi (short)"
        string code UK "en_US, vi (full)"
        string flag "us, vn"
        bool isDefault
        bool isActive
        bool isRtl
        int order
    }
    LanguageMeta {
        int id PK
        string langCode FK
        string origin "MD5 grouping hash"
        int referenceId
        string referenceType
    }
    Post ||--o{ PostTranslation : "translations"
    PostTranslation {
        int postId PK_FK
        string langCode PK
        string title
        string slug
        string excerpt
        string content
    }
    Category ||--o{ CategoryTranslation : "translations"
    CategoryTranslation {
        int categoryId PK_FK
        string langCode PK
        string name
        string description
    }
    Tag ||--o{ TagTranslation : "translations"
    TagTranslation {
        int tagId PK_FK
        string langCode PK
        string name
    }
    Page ||--o{ PageTranslation : "translations"
    PageTranslation {
        int pageId PK_FK
        string langCode PK
        string title
        string slug
        string content
    }
    Slug ||--o{ SlugTranslation : "translations"
    SlugTranslation {
        int slugId PK_FK
        string langCode PK
        string key
        string prefix
    }
    MenuItem ||--o{ MenuItemTranslation : "translations"
    MenuItemTranslation {
        int menuItemId PK_FK
        string langCode PK
        string label
    }
    Language ||--o{ LanguageMeta : "meta"
```

### Translation Tables

| Model | Translation Table | Translatable Fields |
| --- | --- | --- |
| Post | `post_translations` | title, slug, excerpt, content |
| Category | `category_translations` | name, description |
| Tag | `tag_translations` | name |
| Page | `page_translations` | title, slug, content, excerpt |
| Slug | `slug_translations` | key, prefix |
| MenuItem | `menu_item_translations` | label |
| AdminMenuItem | `admin_menu_item_translations` | label |

All translation tables use `onDelete: Cascade` — deleting the parent entity or language automatically cleans up translations.

### API Design

#### tRPC Routers

**`viewer.languages.*`** — Language CRUD (admin-only)

| Procedure | Auth | Description |
| --- | --- | --- |
| `list` | viewer | List all languages |
| `getActive` | public | Active languages for frontend switcher |
| `getById` | viewer | Single language details |
| `create` | admin | Add new language |
| `update` | admin | Edit language |
| `delete` | admin | Remove language + cascade translations |
| `setDefault` | admin | Set default language |
| `getRelatedItems` | viewer | Other language versions of a content item |

**`viewer.translations.*`** — Translation CRUD

| Procedure | Auth | Description |
| --- | --- | --- |
| `languages` | authed | List available languages |
| `getTranslation` | authed | Get translation for entity + langCode |
| `listTranslations` | authed | All translations for an entity |
| `saveTranslation` | admin | Upsert translation |
| `deleteTranslation` | admin | Delete translation |
| `translationStatus` | authed | Which languages have translations for an entity |
| `batchTranslationStatus` | authed | Batch status for multiple entities (max 100) |
| `exportCsv` | admin | Export translations as CSV |
| `importCsv` | admin | Import translations from CSV |

#### Locale Resolution (Public API)

Priority order:
1. `input.ref_lang` query parameter (explicit, for edit forms)
2. `X-Locale` header (set by middleware, from URL path)
3. Default system locale (database `isDefault = true`)

### UI Components

#### Admin

- **Language Settings Page** (`/settings/languages`) — CRUD for supported languages with predefined language picker (~180 languages)
- **LanguageSwitcher** (`@flash-ship/ecom-ui/components/language-switcher.tsx`) — Reusable tab component for edit forms, updates URL `?ref_lang=` state
- **TranslationStatusIndicator** (`@admin/components/translation/TranslationStatusIndicator.tsx`) — Flag icons showing translation coverage per entity in data tables
- **PageTranslationPanel** (`@admin/components/translation/PageTranslationPanel.tsx`) — Inline translation editor with language tabs
- **useLanguageSwitcher** hook — Manages language tab state, active code, and URL sync

#### Customer

- **LanguageSwitcher** (`apps/customer/src/components/LanguageSwitcher.tsx`) — Dropdown with flag + label, persists preference via `NEXT_LOCALE` cookie
- **HrefLangTags** — Generates `<link rel="alternate" hreflang="..." />` and `<meta property="og:locale" />` tags
- **Localized error pages** — `error.tsx` and `not-found.tsx` with inline i18n dicts

## Edge Cases

- **Deleting a language** cascades to all translations, LanguageMeta, and displays a confirmation warning
- **Default language** cannot be deleted
- **Missing translations** fall back to the default language content (TranslationOverlay returns original fields)
- **RTL languages** (e.g., Arabic) store `isRtl: true` for frontend layout adjustments
- **Concurrent translation editing** uses upsert to avoid conflicts

## Out of Scope

- Real-time collaborative translation editing
- Machine translation integration (Google Translate API)
- Translation memory / fuzzy matching
- Per-paragraph translation (content is translated as a whole field)
