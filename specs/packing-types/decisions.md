# Architecture Decision Records (ADRs)

## ADR-001: Soft-Delete instead of Hard-Delete

### Context
When managing packaging types, admins might delete active packaging configurations. If these packaging types are already linked to historic orders or shipments, a hard database deletion would cause referential integrity errors or historical record gaps.

### Options
1.  **Hard Delete**: Clean up the database completely. Pro: Simple. Con: Breaks historical referential integrity.
2.  **Soft Delete**: Introduce a nullable `deletedAt` timestamp column. Pro: Retains historical references while excluding deleted entries from future selections. Con: Slight overhead of filtering active records.

### Decision
Option 2 (Soft Delete). This matches standard design practices used elsewhere in the codebase.

### Consequences
-   All repositories and database queries must filter out records where `deletedAt != null` when loading active lists.
-   When deleting an item via the service layer, we perform an update setting `deletedAt = new Date()` instead of a Prisma `delete` operation.
