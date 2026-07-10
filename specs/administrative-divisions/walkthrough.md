# Vietnam Administrative Divisions Implementation Walkthrough

We have successfully implemented the local management module for Vietnam's Local Administrative Divisions (2-Level Structure: Provinces & Wards).

## Changes Made

### 1. Database & Seeding Layer
- **Schema**: Created [administrative.prisma](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/schema/administrative.prisma) containing `Province` and `Ward` models, styled with camelCase database columns directly to maintain project design standards.
- **Seeder**: Added [13-administrative.seeder.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/seeders/13-administrative.seeder.ts) which seeds 34 provinces and 3,321 wards from JSON datasets with camelCase property fields.
- **preservation**: Confirmed seeder does not delete tables, only upserts data. Appends failures to [seeding_errors.log](file:///Users/hy/SourceCode/flashship/ecom/specs/administrative-divisions/seeding_errors.log).

### 2. Service & Repository Layer
- **Repositories**: Implemented [ProvinceRepository.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/features/administrative/repositories/ProvinceRepository.ts) and [WardRepository.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/features/administrative/repositories/WardRepository.ts) supporting pagination, search, and type safety.
- **Service**: Implemented [AdministrativeService.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/features/administrative/services/AdministrativeService.ts) containing validation logic (parent existence, unique codes).
- **DI Container**: Registered dependencies inside [AdministrativeService.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/features/di/containers/AdministrativeService.ts).

### 3. tRPC Endpoints
- **Handlers**: Developed [divisions.handler.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/trpc/server/routers/viewer/divisions/procedures/divisions.handler.ts) exposing query procedures (`listProvinces`, `getProvince`, `listWards`, `getWard`) and mutations (`createProvince`, `updateProvince`, `createWard`, `updateWard`).
- **Permissions**: Protected with `Permissions.SETTINGS_READ` and `Permissions.SETTINGS_UPDATE`.
- **Registry**: Configured [_router.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/trpc/server/routers/viewer/divisions/_router.ts) and linked in main [_app.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/trpc/server/routers/_app.ts).

### 4. Admin CMS UI
- **Link Card**: Added entry card on settings dashboard: [page.tsx](file:///Users/hy/SourceCode/flashship/ecom/apps/admin/src/app/(main)/settings/page.tsx).
- **Page Layout**: Implemented tabbed interface layout on [DivisionsContent.tsx](file:///Users/hy/SourceCode/flashship/ecom/apps/admin/src/app/(main)/settings/divisions/DivisionsContent.tsx) using Shadcn Tabs:
  - **Provinces Tab**: Displays the Provinces list table with server-side search, pagination, and "Add Province" drawer button. Clicking a province name automatically selects it, filters the Wards list, and programmatically switches to the Wards tab.
  - **Wards Tab**: Displays the cascading Wards list filtered by the selected province, with an active filter badge and "Clear Filter" action. The table displays the resolved parent **Province Name** (e.g. `Thành phố Hà Nội`) in the Province column instead of the raw code ID.
- **Right-Side Sheet Drawers**: Custom drawers slide from the right side of the screen for adding/editing provinces and wards.
- **Translations**: Configured English [settings.json](file:///Users/hy/SourceCode/flashship/ecom/packages/i18n/locales/en/settings.json) and Vietnamese [settings.json](file:///Users/hy/SourceCode/flashship/ecom/packages/i18n/locales/vi/settings.json).

## Verification Results
- Database seeded successfully.
- Code compiles perfectly (`yarn type-check:ci` passed).
- Linting checks completed successfully (`yarn biome check` passed).
