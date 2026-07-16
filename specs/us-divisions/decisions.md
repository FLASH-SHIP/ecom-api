# US States & Cities — Seed into Administrative Divisions

## Status: draft

## Overview

Mở rộng bảng `administrative_divisions` (đã tạo) để lưu trữ 52 US states và ~31,000 US cities. Data được seed từ 2 file JSON có sẵn:

- **States**: [us-states.json](file:///Users/hy/SourceCode/flashship/ecom/specs/administrative-divisions/us-states.json) (52 records)
- **Cities**: [us-cities.json](file:///Users/hy/SourceCode/flashship/ecom/specs/administrative-divisions/us-cities.json) (~31,257 records)

## Data Mapping

### US States → `administrative_divisions` (level 1)

| Source field (`us-states.json`) | Target column | Ví dụ |
|---|---|---|
| `state_id` | `code` | `"CA"` |
| `state_name` | `name` | `"California"` |
| _(fixed)_ | `countryCode` | `"US"` |
| _(fixed)_ | `divisionType` | `"state"` |
| _(fixed)_ | `level` | `1` |
| _(fixed)_ | `parentId` | `null` |

### US Cities → `administrative_divisions` (level 2)

| Source field (`us-cities.json`) | Target column | Ví dụ |
|---|---|---|
| `state_id` + `-` + slugify(`city`) | `code` | `"CA-los_angeles"` |
| `city` | `name` | `"Los Angeles"` |
| `state_id` | → lookup `parentId` | FK → California record |
| _(fixed)_ | `countryCode` | `"US"` |
| _(fixed)_ | `divisionType` | `"city"` |
| _(fixed)_ | `level` | `2` |

> **Note:** `code` cho city dùng format `{state_id}-{slugified_city_name}` để đảm bảo unique trong cùng `countryCode`. Ví dụ: `"CA-los_angeles"`, `"NY-new_york"`.

## Seeder Implementation

### File: `packages/prisma/seeders/14-us-divisions.seeder.ts`

```typescript
// Pseudocode
import usStates from "./data/us-states.json";
import usCities from "./data/us-cities.json";

// 1. Seed states (level 1) — upsert by [countryCode, code]
for (const state of usStates) {
  await prisma.administrativeDivision.upsert({
    where: { countryCode_code: { countryCode: "US", code: state.state_id } },
    update: { name: state.state_name },
    create: {
      countryCode: "US",
      code: state.state_id,
      name: state.state_name,
      divisionType: "state",
      level: 1,
    },
  });
}

// 2. Seed cities (level 2) — lookup parent state, upsert by [countryCode, code]
for (const city of usCities) {
  const parentState = await prisma.administrativeDivision.findUnique({
    where: { countryCode_code: { countryCode: "US", code: city.state_id } },
    select: { id: true },
  });

  const cityCode = `${city.state_id}-${slugify(city.city)}`;
  await prisma.administrativeDivision.upsert({
    where: { countryCode_code: { countryCode: "US", code: cityCode } },
    update: { name: city.city, parentId: parentState.id },
    create: {
      countryCode: "US",
      code: cityCode,
      name: city.city,
      divisionType: "city",
      level: 2,
      parentId: parentState.id,
    },
  });
}
```

### Data files

Copy JSON vào `packages/prisma/seeders/data/` (cùng pattern với VN data):

```
packages/prisma/seeders/data/
├── provinces.json      # VN (đã có)
├── wards.json          # VN (đã có)
├── us-states.json      # US states (mới)
└── us-cities.json      # US cities (mới)
```

### Registry

Thêm seeder mới vào `packages/prisma/seeders/index.ts`:

```typescript
import { UsDivisionsSeeder } from "./14-us-divisions.seeder";

export const SEEDERS: Seeder[] = [
  // ... existing seeders
  AdministrativeDivisionsSeeder,  // 13 — VN provinces/wards
  UsDivisionsSeeder,              // 14 — US states/cities
];
```

## Database Constraints

- **Unique**: `[countryCode, code]` — mỗi record duy nhất trong 1 quốc gia
- **FK**: `parentId` → self-reference (city → state)
- **Index**: `[countryCode, level]` để query nhanh tất cả states/cities của 1 quốc gia

## API Usage (tRPC)

```typescript
// Lấy tất cả US states
listDivisions({ countryCode: "US", level: 1 })

// Lấy cities của California
listDivisions({ countryCode: "US", parentId: <california_id> })

// Search city
listDivisions({ countryCode: "US", level: 2, search: "Los" })
```

> **Important:** API `listDivisions` và `getDivision` cần được tạo mới trong tRPC router `divisions` (hiện tại chỉ có endpoints cho provinces/wards). Tuy nhiên, đây là scope riêng — spec này chỉ focus vào seeder.

## Edge Cases

- **Duplicate city names**: Nhiều state có city cùng tên (ví dụ: "Springfield" có ở 30+ states). Format code `{state_id}-{slug}` xử lý được vấn đề này.
- **Duplicate city trong cùng state**: Nếu `us-cities.json` có 2 records cùng city name + state_id, chỉ record cuối cùng được giữ (upsert behavior). Cần log warning.
- **Performance**: ~31,000 cities upsert tuần tự có thể mất ~2-3 phút. Có thể tối ưu bằng batch insert nếu cần.

## Out of Scope

- Tạo API endpoints mới cho `administrative_divisions` (sẽ làm ở spec riêng)
- UI hiển thị US states/cities trên admin (sẽ làm ở spec riêng)
- Seed data cho quốc gia khác (CN, JP, KR...)

## Checklist

- [ ] Copy `us-states.json` và `us-cities.json` vào `packages/prisma/seeders/data/`
- [ ] Tạo `packages/prisma/seeders/14-us-divisions.seeder.ts`
- [ ] Đăng ký seeder vào `packages/prisma/seeders/index.ts`
- [ ] Chạy seeder: `SEED_ONLY="US" yarn prisma:seed`
- [ ] Verify: 52 states + ~31,257 cities trong bảng `administrative_divisions`
- [ ] Chạy type check: `yarn type-check:ci --force`
