# Type of Packing Management Design

## Overview

This feature provides a management dashboard in the Admin Portal to manage the "Type of Packing" (e.g., Cardboard box, Package bag) used for packing shipments. Admins can create, view, update, and soft-delete packing types.

## Problem Statement

Currently, there is no centralized database or management interface for packaging types in the Ecom workspace. Orders require distinct packaging configurations to calculate shipping dimensions, volumetric weights, and material costs. This feature sets the foundation for packaging logistics.

## User Stories

- As an admin, I want to see a list of packing types so that I can monitor active packaging options.
- As an admin, I want to create new packing types (like Cardboard box or Package bag) with a name, description, status, and image.
- As an admin, I want to update an existing packing type to change its details or status.
- As an admin, I want to soft-delete packing types that are no longer used so they are hidden from the active selection but preserved for historical order data.

## Technical Design

### Database Changes

We will introduce a new model `PackingType` in a new schema file: [packing.prisma](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/schema/packing.prisma).

```prisma
// packages/prisma/schema/packing.prisma

model PackingType {
  id          Int           @id @default(autoincrement())
  name        String        @unique
  image       String?       // Media file key or URL
  description String?       @db.Text
  status      ContentStatus @default(DRAFT) // PUBLISHED = Active (visible/usable), DRAFT = Inactive (hidden/unusable)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  deletedAt   DateTime?

  @@map("packing_types")
}
```

#### Seeder Configuration

A new seeder [12-packing.seeder.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/prisma/seeders/12-packing.seeder.ts) will be created to seed the initial two packing types:
1.  **Cardboard box** (status: `PUBLISHED` (Active), image: `"/assets/images/packing-types/cardboard-box.svg"`, description: `Standard cardboard box for secure shipping`)
2.  **Package bag** (status: `PUBLISHED` (Active), image: `"/assets/images/packing-types/packing-bag.svg"`, description: `Flexible plastic package bag for lightweight items`)

### API Changes

A new viewer tRPC router `packing` will be added in [packages/trpc/server/routers/viewer/packing.ts](file:///Users/hy/SourceCode/flashship/ecom/packages/trpc/server/routers/viewer/packing.ts).

Procedures:
-   `list`: Returns a paginated list of active packing types (where `deletedAt == null`) with search filters.
-   `get`: Retrieves a single packing type by its ID.
-   `create`: Creates a new packing type. Validates name uniqueness.
-   `update`: Updates name, image, description, or status of an existing packing type.
-   `delete`: Soft-deletes a packing type by setting `deletedAt = new Date()`.

### UI Changes

Admin Settings Route: `/settings/packing` ([page.tsx](file:///Users/hy/SourceCode/flashship/ecom/apps/admin/src/app/(main)/settings/packing/page.tsx))

-   **Table View**: Displays columns for Image, Name, Description, Status, and Actions (Edit, Delete).
-   **Create/Edit Dialog**: A Modal form to input Name (text), Status (select: DRAFT/PUBLISHED), Description (textarea), and Image (integrated with the Admin Portal's Media Library selection).
-   **Soft Delete Confirmation**: Confirms before deleting, showing warning details.

## Edge Cases

-   **Uniqueness**: Packing Type names must be unique. Database constraint on `name` prevents duplicate records. Form validation must display clear user feedback.
-   **Status Transition**: Disabling or archiving a packaging type should not affect existing historical orders that reference its ID.
-   **Soft Deletion**: Packing types that are soft-deleted must be excluded from active dropdown selectors in order/shipment flows, but remain in the database for relational history.

## Out of Scope

-   Volumetric calculation rules based on packaging size (deferred for packing dimension configuration phase).
-   Packaging inventory tracking or stock alerts.
