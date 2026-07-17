# US States & Cities — Admin Settings UI

## Status: draft

## Overview

Tạo trang quản lý US States + Cities ở Admin Settings, tương tự trang VN Provinces/Wards hiện tại ([DivisionsContent.tsx](file:///Users/hy/SourceCode/flashship/ecom/apps/admin/src/app/(main)/settings/divisions/DivisionsContent.tsx)). Data đọc từ bảng `administrative_divisions` (đã seed 52 states + 31,257 cities).

## User Stories

- As an Admin, tôi muốn xem danh sách US states và tìm kiếm theo tên.
- As an Admin, tôi muốn click vào 1 state để xem tất cả cities thuộc state đó.
- As an Admin, tôi muốn thêm/sửa state và city thông qua sheet drawer (giống trang VN provinces/wards).
- As a Developer, tôi muốn query states/cities via type-safe tRPC APIs.

## Technical Design

### 1. Backend — tRPC Endpoints

Thêm các endpoint mới vào router `divisions` (file [divisions.handler.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/trpc/server/routers/viewer/divisions/procedures/divisions.handler.ts)):

#### Query Endpoints

| Endpoint | Input | Output | Mô tả |
|---|---|---|---|
| `listDivisions` | `{ countryCode, level?, parentId?, search?, page, limit }` | `{ items, total, page, limit, totalPages }` | Truy vấn generic cho `administrative_divisions` |
| `getDivision` | `{ id }` | Single division record | Lấy chi tiết 1 division |

#### Mutation Endpoints

| Endpoint | Input | Output | Mô tả |
|---|---|---|---|
| `createDivision` | `{ countryCode, code, name, nameEn?, divisionType, level, parentId? }` | Created record | Tạo state/city mới |
| `updateDivision` | `{ id, name?, nameEn?, divisionType?, isActive? }` | Updated record | Cập nhật state/city |

> **Note:** Không có endpoint delete — giống với provinces/wards, đơn vị hành chính không được xóa qua UI.

### 2. Backend — Repository

Tạo file mới: `packages/features/administrative/repositories/AdministrativeDivisionRepository.ts`

```typescript
export class AdministrativeDivisionRepository {
  async list(params: {
    countryCode: string;
    level?: number;
    parentId?: number;
    search?: string;
    skip?: number;
    take?: number;
  }) { /* query prisma.administrativeDivision */ }

  async findById(id: number) { /* ... */ }
  
  async findByCountryAndCode(countryCode: string, code: string) { /* ... */ }

  async create(data: { countryCode, code, name, nameEn?, divisionType, level, parentId? }) { /* ... */ }

  async update(id: number, data: { name?, nameEn?, divisionType?, isActive? }) { /* ... */ }
}
```

### 3. Backend — Service

Cập nhật file [AdministrativeService.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/features/administrative/services/AdministrativeService.ts), thêm methods:

```typescript
// Thêm vào AdministrativeService
async listDivisions(params: { countryCode, level?, parentId?, search?, page?, limit? })
async getDivision(id: number)
async createDivision(data: { countryCode, code, name, nameEn?, divisionType, level, parentId? })
async updateDivision(id: number, data: { name?, nameEn?, divisionType?, isActive? })
```

### 4. Frontend — New Page

#### Route: `/settings/us-divisions`

Tạo page mới tại: `apps/admin/src/app/(main)/settings/us-divisions/`

```
apps/admin/src/app/(main)/settings/us-divisions/
├── page.tsx                 # Permission guard + dynamic import
└── UsDivisionsContent.tsx   # Main content (2 tabs)
```

#### Layout (giống DivisionsContent.tsx)

```
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb: Settings > US Divisions                          │
│                                                              │
│ ┌─ Tab: States ─┬─ Tab: Cities ─┐       [+ Add State/City] │
│ │               │                │                           │
│ ├───────────────┴────────────────┤                           │
│ │                                                            │
│ │  ┌──────┬──────────────┬───────────┐                       │
│ │  │ Code │ Name         │ Type      │                       │
│ │  ├──────┼──────────────┼───────────┤                       │
│ │  │ CA   │ California   │ state     │ ← click → Cities tab │
│ │  │ NY   │ New York     │ state     │                       │
│ │  │ TX   │ Texas        │ state     │                       │
│ │  │ ...  │ ...          │ ...       │                       │
│ │  └──────┴──────────────┴───────────┘                       │
│ │                                                            │
│ │  Pagination: < 1 2 3 ... 6 >                               │
│ └────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────┘
```

#### States Tab — Columns

| Column | Field | Width | Behavior |
|---|---|---|---|
| Code | `code` | 80px | e.g. "CA", "NY" |
| Name | `name` | auto | **Clickable** → switch to Cities tab + filter by state |
| Division Type | `divisionType` | 120px | e.g. "state" |
| isActive | `isActive` | 80px | Badge: Active/Inactive |

#### Cities Tab — Columns

| Column | Field | Width | Behavior |
|---|---|---|---|
| Code | `code` | 160px | e.g. "CA-los_angeles" |
| Name | `name` | auto | City name |
| Division Type | `divisionType` | 120px | e.g. "city" |
| State | parent.name | 140px | Parent state name |

#### Cities Tab — State Filter Banner

Khi user click 1 state ở States tab → auto switch sang Cities tab + hiện banner:
```
┌────────────────────────────────────────────────────┐
│ Filtering by state: California      [Clear Filter] │
└────────────────────────────────────────────────────┘
```

#### Sheet Drawer — Add/Edit State

```
┌─────────────────────────────────┐
│ Add New State            [×]    │
├─────────────────────────────────┤
│                                 │
│ Name *                          │
│ ┌─────────────────────────────┐ │
│ │ e.g. California             │ │
│ └─────────────────────────────┘ │
│                                 │
│ Code *                          │
│ ┌─────────────────────────────┐ │
│ │ e.g. CA                     │ │
│ └─────────────────────────────┘ │
│                                 │
│ Division Type                   │
│ ┌─────────────────────────────┐ │
│ │ state                   ▼   │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ [  Cancel  ] [     Save     ]   │
└─────────────────────────────────┘
```

#### Sheet Drawer — Add/Edit City

```
┌─────────────────────────────────┐
│ Add New City             [×]    │
├─────────────────────────────────┤
│                                 │
│ Name *                          │
│ ┌─────────────────────────────┐ │
│ │ e.g. Los Angeles            │ │
│ └─────────────────────────────┘ │
│                                 │
│ Code *                          │
│ ┌─────────────────────────────┐ │
│ │ e.g. CA-los_angeles         │ │
│ └─────────────────────────────┘ │
│                                 │
│ Division Type                   │
│ ┌─────────────────────────────┐ │
│ │ city                    ▼   │ │
│ └─────────────────────────────┘ │
│                                 │
│ Belongs to State *              │
│ ┌─────────────────────────────┐ │
│ │ California (CA)         ▼   │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ [  Cancel  ] [     Save     ]   │
└─────────────────────────────────┘
```

### 5. Settings Overview — Add Navigation Card

File: [settings/page.tsx](file:///Users/hy/SourceCode/flashship/ecom/apps/admin/src/app/(main)/settings/page.tsx)

Thêm card link tới `/settings/us-divisions` (cùng pattern với card "Vietnam Administrative Divisions").

### 6. Translations (i18n)

Thêm key mới vào `packages/i18n/locales/en/settings.json` và `vi/settings.json`:

```json
{
  "usDivisions": {
    "title": "US States & Cities",
    "subtitle": "Manage US states and cities for address selection",
    "statesTab": "States",
    "citiesTab": "Cities",
    "stateList": "US States",
    "cityList": "US Cities",
    "addState": "Add State",
    "addCity": "Add City",
    "editState": "Edit State",
    "editCity": "Edit City",
    "colCode": "Code",
    "colName": "Name",
    "colDivisionType": "Type",
    "colState": "State",
    "colActive": "Active",
    "createStateTitle": "Add New State",
    "updateStateTitle": "Update State",
    "createCityTitle": "Add New City",
    "updateCityTitle": "Update City",
    "lblName": "Name",
    "lblCode": "Code",
    "lblDivisionType": "Division Type",
    "lblState": "Belongs to State",
    "placeholderName": "e.g. California",
    "placeholderCode": "e.g. CA",
    "selectState": "Select State",
    "toastCreateStateSuccess": "State created successfully",
    "toastUpdateStateSuccess": "State updated successfully",
    "toastCreateCitySuccess": "City created successfully",
    "toastUpdateCitySuccess": "City updated successfully"
  }
}
```

## Files Changed / Created

| Layer | File | Action |
|---|---|---|
| **Repository** | `packages/features/administrative/repositories/AdministrativeDivisionRepository.ts` | **[NEW]** |
| **Service** | `packages/features/administrative/services/AdministrativeService.ts` | **[MODIFY]** — thêm division methods |
| **DI** | `packages/features/di/containers/AdministrativeService.ts` | **[MODIFY]** — register new repo |
| **tRPC Handler** | `packages/trpc/server/routers/viewer/divisions/procedures/divisions.handler.ts` | **[MODIFY]** — thêm endpoints |
| **tRPC Router** | `packages/trpc/server/routers/viewer/divisions/_router.ts` | **[MODIFY]** — register endpoints |
| **UI Page** | `apps/admin/src/app/(main)/settings/us-divisions/page.tsx` | **[NEW]** |
| **UI Content** | `apps/admin/src/app/(main)/settings/us-divisions/UsDivisionsContent.tsx` | **[NEW]** |
| **Settings** | `apps/admin/src/app/(main)/settings/page.tsx` | **[MODIFY]** — thêm card link |
| **i18n EN** | `packages/i18n/locales/en/settings.json` | **[MODIFY]** — thêm `usDivisions` keys |
| **i18n VI** | `packages/i18n/locales/vi/settings.json` | **[MODIFY]** — thêm `usDivisions` keys |

## Edge Cases

- **31,000+ cities**: Cities tab phải dùng server-side pagination, không load tất cả.
- **Search performance**: Search cities cần index `[countryCode, level]` + full-text trên `name` (đã có index).
- **State dropdown trong City form**: Load tất cả 52 states (nhỏ, OK để load hết).
- **Duplicate city code**: Khi tạo city mới qua UI, tự sinh code = `{stateCode}-{slugify(cityName)}`. Nếu trùng → báo lỗi.

## Out of Scope

- Delete state/city (giống provinces/wards — không cho xóa qua UI)
- Bulk import từ CSV/Excel
- Tích hợp vào order form (chọn state/city khi tạo order)

## Verification Plan

### Automated Tests
```bash
yarn type-check:ci --force
TZ=UTC yarn test packages/features/administrative
```

### Manual Verification
- Truy cập `/settings/us-divisions` → hiển thị 52 states
- Click "California" → switch sang Cities tab, filter 1,598 cities
- Tạo state/city mới qua drawer
- Search city "Los Angeles" → tìm thấy
- Clear filter → hiển thị tất cả cities
