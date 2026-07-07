# Rate Cards (Logistics Tariff Engine) Design Specification

## Overview

The Rate Cards module is a self-contained, independent tariff engine for the Ecom Logistics platform. Its sole responsibility is to store, retrieve, and calculate shipping fees based on weight, destination country/zone, and shipping method. It provides administration screens for Ecom operators to manage Rate Cards (pricing sheets) and exposes calculation endpoints for other modules to consume.

All customer rate targeting is unified under **Customer Groups**. If a customer needs a custom negotiated rate card, they are assigned to a specific group containing their account, and the rate card is linked to that group.

---

## Technical Architecture & Database Models

To remain decoupled, the module is modeled around 3 core database tables, referencing the existing `Customer` and `ShippingMethod` tables only as lookup keys.

### 1. Database Schema (`schema.prisma`)

```prisma
enum RateCardType {
  STEP_FIXED     // Fixed flat price for a generated weight step (e.g., (1.0 - 1.5] kg -> $51.34)
  RANGE_FIXED    // Fixed flat price for a custom weight range (e.g., (20.0 - 30.0] kg -> $200.00 flat)
  RANGE_PER_KG   // Price multiplied by weight for a custom range (e.g., (20.0 - 44.0] kg -> $10.99 per kg)
}

// Reuses ContentStatus (DRAFT, PUBLISHED, ARCHIVED) for lifecycle management
model RateCard {
  id             Int            @id @default(autoincrement())
  code           String         @unique // Unique identifier (e.g., "EPACKET_DEFAULT_US", "EXPRESS_LEGIFT_US")
  name           String         // Display name (e.g., "Bảng giá Epacket Mặc định US")
  status         ContentStatus  @default(DRAFT) // DRAFT (editing), PUBLISHED (active), ARCHIVED (deprecated)
  
  shippingMethod ShippingMethod // Enum: EXPRESS | EPACKET
  country        String         @default("US") // Destination country code (e.g. "US", "CA")
  origin         String?        // Origin cargo hub (e.g., "SGN", "HAN") - if null, applies globally
  currency       String         @default("USD") // Currency code (e.g., "USD", "VND")
  
  // Ecom Billing Rules applied to dynamic grid generation and calculations
  weightStep     Decimal        @db.Decimal(10, 3) // Whitelisted values: 0.05, 0.10, 0.50
  minWeight      Decimal        @db.Decimal(10, 3) // Start weight limit of the sheet (usually 0.000)
  maxWeight      Decimal        @db.Decimal(10, 3) // End weight limit of the flat slabs (usually 20.000)
  
  // Waterfall targeting relation
  groups         RateCardGroup[] // Many-to-Many link to Customer Groups. If empty, acts as the system-wide default.
  
  items          RateCardItem[] // Child weight tiers and price records
  
  // Validity period fields (optional time limits)
  startDate      DateTime?      @map("start_date")
  endDate        DateTime?      @map("end_date")
  
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  @@index([shippingMethod, country, origin, status])
  @@map("rate_cards")
}

model CustomerGroup {
  id        Int               @id @default(autoincrement())
  code      String            @unique // e.g. "DEFAULT", "POD_SGN", "VIP_GOLD"
  name      String            // e.g. "Default Base Group", "Sài Gòn POD Sellers"
  
  customers Customer[]        // One-to-Many with Customer (a customer belongs to exactly 1 group)
  rateCards RateCardGroup[]   // Many-to-Many with RateCard
  
  createdAt DateTime          @default(now()) @map("created_at")
  updatedAt DateTime          @updatedAt @map("updated_at")

  @@map("customer_groups")
}

model RateCardGroup {
  id              Int           @id @default(autoincrement())
  rateCardId      Int           @map("rate_card_id")
  rateCard        RateCard      @relation(fields: [rateCardId], references: [id], onDelete: Cascade)
  customerGroupId Int           @map("customer_group_id")
  customerGroup   CustomerGroup @relation(fields: [customerGroupId], references: [id], onDelete: Cascade)

  @@unique([rateCardId, customerGroupId])
  @@index([customerGroupId])
  @@map("rate_card_groups")
}

model RateCardItem {
  id             Int              @id @default(autoincrement())
  rateCardId     Int              @map("rate_card_id")
  rateCard       RateCard         @relation(fields: [rateCardId], references: [id], onDelete: Cascade)
  
  startWeight    Decimal          @db.Decimal(10, 3) // weight range start (exclusive)
  endWeight      Decimal          @db.Decimal(10, 3) // weight range end (inclusive)
  
  rateType       RateCardType     @default(STEP_FIXED)
  amount         Decimal          @db.Decimal(12, 2) // Flat price or unit price per kg
  
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  @@index([rateCardId])
  @@map("rate_card_items")
}

```

---

## Technical Pricing Calculation

For a given calculation request containing:
- `shippingMethod` ($M$)
- `country` ($C$)
- `weight` ($W$) (chargeable weight after volumetric check: $\max(physical, L \times W \times H / 5000)$)
- `origin` ($O$) (origin cargo hub, e.g., "SGN", "HAN")
- `customerId` ($CustID$)
- `customerGroupId` ($GroupID$)
- `calculationDate` ($D$) (defaulting to current time)

The `RateCardService` executes the following sequential steps:

#### Step 1: Rate Card Resolution (2-Step Fallback Cascade)
Find the active, `PUBLISHED` Rate Card matching $M$, $C$, $O$, and validity window $D$ ($startDate \le D \le endDate$), resolving priority in this order:
1. **P1 (Group Specific)**: Linked to the customer's group via `RateCardGroup` (`customerGroupId = GroupID`).
2. **P2 (System Default)**: System-wide default Rate Card (where `RateCardGroup` link is empty / has no groups assigned).

*If multiple Rate Cards match at the same priority level, the system selects the one with the newest `createdAt` timestamp.*

#### Step 2: Weight Rounding
Retrieve the selected Rate Card's `weightStep` ($S$) and `minWeight` ($minW$). Round weight $W$ up to the nearest multiple of $S$:
$$RW = \lceil \frac{W}{S} \rceil \times S$$
If the rounded weight $RW$ is less than the minimum weight limit $minW$ of the resolved rate card, enforce the minimum billed weight:
$$RW = \max(RW, minW)$$

#### Step 3: Price Evaluation
Query the child `RateCardItem` tiers for the selected `rateCardId` where $RW$ falls within the range `startWeight < RW && RW <= endWeight`.
- If `rateType = STEP_FIXED` or `rateType = RANGE_FIXED`, `Freight Cost = amount`.
- If `rateType = RANGE_PER_KG`, `Freight Cost = RW * amount`.

#### Step 4: Caching Layer (Redis Optimization)
- **Calculations Caching**: Because pricing calculations are read-heavy, resolved rate cards are cached in Redis using key `rate-cards:group:${customerGroupId}:${shippingMethod}:${country}:${origin}`.
- **Cache Invalidation**: Any write mutation (updates, archiving, deletion) to `RateCard` or `RateCardItem` will trigger an automatic event that invalidates the cached key for the linked group(s) to guarantee immediate rate updates.

---

## Admin Portal Rate Creation UI

The admin screen for managing Rate Cards is located at `/settings/rates`:

### 1. General Header Configuration
* **Code (Unique)**: Unique string id.
* **Name**: Display label.
* **Status**: `ContentStatus` enum (`DRAFT`, `PUBLISHED`, `ARCHIVED`).
* **Origin**: Select input defaulting to `"SGN"` (options: `"SGN"`, `"HAN"`).
* **Validity Period**: Optional `startDate` (Apply From) and `endDate` (Apply To) fields.
* **Target Groups**: Multi-select dropdown to choose one or more **Customer Groups** (maps to `RateCardGroup`). If left empty, this Rate Card serves as the system-wide default.

### 2. Dynamic Grid Generation (Integer Precision)
* Admin enters `minWeight` (e.g. 0) and `maxWeight` (e.g. 20), and selects a step from the dynamic dropdown:
  - **EPACKET**: Options `[0.05, 0.10]` (default standard is `0.05`).
  - **EXPRESS**: Options `[0.50, 1.00]` (default standard is `0.50`).
* Upon selecting, the UI automatically generates input fields for each weight step using integer precision (converting values to grams/integers during step loops).
* **Price Monotonicity & Continuity Validation**:
  - **Monotonicity**: Validate that a heavier weight step cannot have a lower price than the previous step.
  - **Continuity (No Gaps or Overlaps)**: The backend validates that all defined slabs and custom ranges are strictly contiguous (`startWeight[i+1] == endWeight[i]`).

### 3. Custom Heavy Cargo Tiers
* Ability to add custom ranges (e.g., `20.000` to `44.000`) selecting pricing types (`RANGE_FIXED` or `RANGE_PER_KG`) and entering price amounts.

### 4. Change History & Auditing
* **Automatic Audit Logging**: Since Rate Cards contain sensitive pricing and financial parameters, any database write operations (create, update, archive) on `RateCard`, `RateCardGroup`, and `RateCardItem` will be globally intercepted and automatically logged by Ecom's Prisma Query Extension.
* **Log Payload**: Records are saved in the `AuditLog` model containing: the Admin `userId`, action (`CREATE`/`UPDATE`/`DELETE`), `entityType` (`RateCard`/`RateCardItem`), `entityId`, and JSON snapshots of `oldValues` and `newValues`.
* **Audit Trail UI**: The Admin Rate Card edit page will display a "Lịch sử thay đổi" (Change Logs) tab that queries and lists these `AuditLog` records, enabling operators to trace which admin updated cước rates, when, and exactly what numbers changed.

### 5. Excel Slab Import/Export Flow
* **Export Slabs Template**: Admin can download an auto-generated `.xlsx` template pre-filled with the weight steps sequence (`startWeight` to `endWeight`) generated based on `minWeight`, `maxWeight`, and `weightStep`.
* **Import Slabs**: Admin can upload the `.xlsx` file filled with prices (`amount` column). The tRPC backend procedure parses the file (using the existing `xlsx` utility), performs price monotonicity and continuity checks, and bulk inserts/updates the `RateCardItem` records inside a database transaction.

---

## API Endpoints (tRPC Router `rateCards`)

- `rateCards.calculate`: Public calculation procedure for checkout forms.
- `rateCards.list`: Retrieve paginated Rate Cards with filters.
- `rateCards.create` / `rateCards.update` / `rateCards.delete`: CRUD operations.

---

## Edge Cases

1. **Weight Exceeds All Ranges**: If weight exceeds the maximum defined limit in the selected Rate Card, return a calculation error.
2. **Overlap Publishing Constraint**: The backend validator rejects transitioning a `RateCard` from `DRAFT` to `PUBLISHED` if there is another card already in `PUBLISHED` status that overlaps in `shippingMethod`, `country`, shares at least one target `CustomerGroup`, and has an overlapping `startDate` and `endDate` validity window. This prevents pricing lookup conflicts.
3. **Data Immutability & Pricing Snapshots**: To preserve historical financial integrity, the calculated freight amount must be saved as a static snapshot directly on the order booking record at checkout. The system must save:
   - `freightCost` (Decimal): Total calculated shipping cost.
   - `appliedRateCardId` (Int?): Reference to the parent `RateCard` sheet.
   - `appliedRateCardSnapshot` (Json?): A snapshot of the parent sheet metadata and the single applied child `RateCardItem` slab (e.g. `{ rateCardId, rateCardCode, rateCardName, itemId, startWeight, endWeight, rateType, amount }`).
   - Modifying, archiving, or deleting a `RateCard` or `RateCardItem` in the future must never recalculate or affect already processed transactions.
4. **Rate Card Not Found**: If no published rate card matches the criteria (shipping method, destination country, origin hub, date validity window, and fallback cascade), the calculation procedure returns a clear `RateCardNotFound` calculation error instead of failing silently or using arbitrary fallback values.

---

## Out of Scope (Decoupled Boundaries)

* Orders storage and order status updates (e.g., `Order`, `OrderItem`).
* Address verification adapters (USPS Validation APIs).
* Master Box consolidation.
* Outbound Webhook triggers and timeline logging.
* Payments and Wallet balance deductions.
