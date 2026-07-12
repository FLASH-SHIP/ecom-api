# Vietnam Administrative Divisions (2-Level) Design

## Overview

This feature provides a robust management system for Vietnamese administrative divisions modeled as a simplified 2-level hierarchy: **Provinces** and **Wards**. It is designed to support address selection, local administrative routing, and zone-based delivery pricing.

## Problem Statement

Accurate and standardized address selection is critical for shipping calculation, checkout flows, and seller settings. Implementing a two-level local government directory (Provinces directly mapped to Wards) simplifies the user experience while maintaining structural integrity for local logistics.

## User Stories

- As an Admin, I want to manage (view, search, add, update, delete) provinces and wards so that the address directory stays up-to-date.
- As a Customer, I want to select my Province and Ward from a cascading dropdown during checkout so that my order shipping rates are calculated correctly.
- As a Developer, I want to query provinces and wards via type-safe APIs for address autocomplete and form validations.

## Technical Design

### Database Changes

We will introduce two new tables: `provinces` and `wards` in the Prisma schema folder (`packages/prisma/schema/administrative.prisma`).

```prisma
model Province {
  id           Int        @id @default(autoincrement())
  name         String
  code         Int        @unique
  divisionType String     // e.g. "thành phố trung ương", "tỉnh"
  codeName     String     // e.g. "ha_noi"
  phoneCode    Int
  wards        Ward[]

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@map("provinces")
}

model Ward {
  id           Int        @id @default(autoincrement())
  name         String
  code         Int        @unique
  divisionType String     // e.g. "phường", "xã", "đặc khu"
  codeName     String     // e.g. "phuong_ngoc_ha"
  provinceCode Int
  province     Province   @relation(fields: [provinceCode], references: [code], onDelete: Cascade)

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@map("wards")
}
```

#### Seeding Data from JSON Files
The database tables will be populated automatically during migrations or seeding by reading the local JSON files located in the specs folder:
- **Provinces Source**: [provinces.json](file:///Users/hy/SourceCode/flashship/ecom/specs/administrative-divisions/provinces.json)
- **Wards Source**: [wards.json](file:///Users/hy/SourceCode/flashship/ecom/specs/administrative-divisions/wards.json)

The database seed script (`packages/prisma/seeders/13-administrative.seeder.ts`) will read these JSON files, map/validate the fields, and perform batch upserts (`basePrisma.province.upsert` and `basePrisma.ward.upsert`) using the unique `code` field to prevent duplication.

##### 1. Database Preservation Strategy (No DB Reset)
To prevent accidental data loss in other tables (such as `User`, `PackingType`, etc.), the seeder MUST NOT perform table truncation or deletion (`deleteMany` or drop commands) on ANY tables. It will only perform `upsert` queries to merge the administrative divisions data. 

##### 2. Seeding Error Logging
During the upsert process, the seeder will wrap individual upserts in a `try-catch` block. If any record fails to upsert (due to validation, formatting, or relation issues), the script will catch the error and append a detailed error entry (including record ID, code, name, and error message) to a dedicated log file:
- **Error Log File**: [seeding_errors.log](file:///Users/hy/SourceCode/flashship/ecom/specs/administrative-divisions/seeding_errors.log)

This ensures that the seeding run does not abort completely on minor data discrepancies and provides a clear audit trail for the developer.



### API Changes

We will register a new tRPC router `divisions` in `packages/trpc/server/routers/viewer/divisions/` exposing:

1. `listProvinces`: Paginated query returning provinces with search, divisionType filtering.
2. `getProvince`: Returns details of a specific province.
3. `listWards`: Paginated query returning wards matching a given `provinceCode` with search filters.
4. `getWard`: Returns details of a specific ward.
5. Write actions (restricted to Workspace Admins with `Permissions.SETTINGS_UPDATE`):
   - `createProvince` / `updateProvince` (Create/Update Province using a Right-Side Sheet Drawer)
   - `createWard` / `updateWard` (Create/Update Ward using a Right-Side Sheet Drawer)

### UI Changes

#### Admin Settings Workspace
- New setting page under `/settings/divisions` to manage the address directory.
- Tabbed interface layout using Shadcn Tabs:
  - **Provinces Tab**: Provinces list table with search, division type filtering, and add/edit Drawers opening from the right side of the screen. Clicking a province can redirect the user to the Wards tab with that province filter pre-applied.
  - **Wards Tab**: Wards list table with search, division type filtering, and cascading province filtering. Displays the parent Province Name directly in the columns (instead of the raw ID) by resolving the relation in the database query. Add/edit Wards will open in a Right-Side Sheet Drawer.

#### Administrative Drawers (Add/Edit Sheet)
To match the exact visual layout of the Packing page drawer:
- **SheetContent**: `side="right" className="flex w-full flex-col p-0 sm:max-w-[480px]"` (removes default padding for full border alignment).
- **SheetHeader**: `className="border-b border-border px-6 py-4"` (creates a clean bordered header block).
- **Form Wrapper**: `className="flex flex-1 flex-col overflow-hidden"`
- **PerfectScroll Area**: `className="flex flex-1 flex-col px-6 py-6 overflow-y-auto"`
  - Contains fields wrapped in `<div className="flex flex-col gap-5 pb-6">` using `<div className="grid gap-2">` instead of `space-y-1.5` for input layout.
- **Labels**: `className="text-sm font-semibold text-sys-primary"` with asterisks in `className="text-sys-dangerous"`.
- **Footer Buttons**:
  - Anchored at the bottom inside `PerfectScroll` using `className="mt-auto flex gap-3 border-t border-border pt-6"`.
  - Both "Cancel" and "Save" buttons stretch to fill the width equally using `className="flex-1"`.



#### Cascading Dropdown Component
- Shared UI component `<AddressSelector />` in `@admin/components/base/` and `@customer/components/base/` featuring:
  - Select Province -> Fetches Wards matching province `code` -> Select Ward.

## Edge Cases

- **Duplicate Codes**: Province and Ward codes must be unique integer values (e.g., Code 1 for Hanoi, Code 8 for Ngoc Ha).
- **Large Dataset Performance**: Vietnam has 63 provinces and over 10,000 wards. Queries for Wards must support fast indexing. We should add indexes on `provinceCode` and `codeName` for rapid lookup.

## Out of Scope

- **Delete/Remove Feature**: Since administrative divisions (Provinces/Wards) represent official state-issued geographical boundaries, they cannot be deleted/removed via the UI or tRPC API. Any corrections or updates should be made by modifying the source JSON files and re-running the seeder, or updating the records via the Edit drawer.
- **District Level**: There is no intermediate "District" (Quận/Huyện) level. Wards map directly to Provinces as per the 2-Level Administrative Division design.
- **External Address Geocoding**: Integration with Mapbox or Google Maps geocoders is out of scope for the initial version.
