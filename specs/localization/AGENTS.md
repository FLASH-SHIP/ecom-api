# Localization Feature — Agent Instructions

When working on the localization feature:

1. **Read first**: Start with `specs/localization/design.md` for architecture and `specs/localization/implementation.md` for current status
2. **Check decisions**: Review `specs/localization/decisions.md` before making architectural changes
3. **Translation tables**: All use `onDelete: Cascade` — never change this without discussion
4. **TranslationOverlay**: Always use batch overlay functions (not single-entity) for list endpoints
5. **LanguageLocaleCache**: Invalidate cache when modifying languages (the service handles this automatically)
6. **Adding new translatable models**: Follow the checklist in `specs/localization/prompts.md`
7. **Customer app locales**: Must update both `apps/customer/src/lib/i18n.ts` AND `apps/customer/src/middleware.ts` when adding locales
8. **Error pages**: Use inline translation dicts (no external i18n library in customer app)
9. **CSV service**: Test with edge cases — quoted fields, commas in content, empty translations
10. **Security**: Never expose `password`, `hashedKey`, or token fields in any translation query
