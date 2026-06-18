# Localization Future Work

Ideas and enhancements deferred from initial implementation.

## Enhancements

- **Machine translation integration** — Add a "Translate with AI" button that pre-fills translation fields using an LLM or Google Translate API
- **Translation memory** — Track previously translated phrases and suggest them for similar content (fuzzy matching)
- **Per-paragraph translation** — Instead of translating entire fields, allow paragraph-level translation with a side-by-side editor
- **Language-specific SEO fields** — Allow different SEO meta (title, description, image) per language in the SeoMeta model
- **Translation progress dashboard** — A dedicated page showing overall translation coverage across all content types

## Technical Debt

- **Prisma v6 `datasource url` migration** — Move connection URL from `schema.prisma` to `prisma.config.ts` (Prisma v6 deprecation warning)
- **Static locale list in middleware** — Currently hardcoded `["vi", "en"]`; should be fetched from DB at build time or from a shared config
- **Multi-instance cache invalidation** — `LanguageLocaleCache` is in-memory only; for horizontal scaling, add Redis pub/sub invalidation layer

## Nice to Have

- **Translation workflow states** — Draft/Review/Approved states for translations with reviewer assignment
- **Translation diff view** — Show what changed in the original content since the last translation update
- **Bulk translation operations** — Select multiple entities in a data table and assign to a translator
- **API key scoped by language** — Allow API keys that only return content in a specific language
- **Language-specific redirects** — Redirect rules that apply only for certain locales
- **Pluralization support** — ICU MessageFormat for UI strings with plural forms
