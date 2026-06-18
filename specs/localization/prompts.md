# Localization Prompts

## Sync Implementation Status

Review what's been implemented for localization and update specs/localization/implementation.md

## Generate Tests

Write tests for TranslationCsvService. Follow existing test patterns in `packages/features/translation/services/__tests__/`.

## Code Review

Review changes for: type safety, error handling, security, edge cases

## Continue Feature

Continue working on localization. Read specs/localization/implementation.md for current status.

## Generate Docs with Screenshots

Generate documentation for localization with screenshots:

1. Open the feature in the browser
2. Take screenshots of key UI states using the browser extension
3. Save screenshots to specs/localization/docs/screenshots/
4. Create/update specs/localization/docs/README.md with:
   - Feature overview
   - How to use (step-by-step with screenshots)
   - Configuration options
   - Common use cases

## Promote Docs to Public

Promote internal docs to public Mintlify docs:

1. Review specs/localization/docs/README.md
2. Copy/adapt content to docs/localization.mdx
3. Move screenshots to docs/images/localization/
4. Update docs/mint.json navigation
5. Ensure customer-appropriate language (no internal details)

## Add a New Translatable Model

When adding translation support to a new model:

1. Add `*Translation` model to `schema.prisma` with `onDelete: Cascade`
2. Run `yarn prisma migrate dev` and `yarn prisma generate`
3. Add find/upsert/delete methods to `TranslationRepository`
4. Add the entity type to `TranslationService` switch statements
5. Add overlay function to `TranslationOverlay`
6. Add the entity type to `TranslationCsvService` export/import
7. Add `TranslationStatusIndicator` to the entity's list page
8. Add `LanguageSwitcher` integration to the entity's edit form
