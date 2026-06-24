---
title: Use DTOs at Every Architectural Boundary
impact: CRITICAL
impactDescription: Prevents technology coupling and security risks
tags: data, dto, boundaries, security, types
---

## Use DTOs at Every Architectural Boundary

**Impact: CRITICAL**

Database types should not leak to the frontend. Use explicit DTOs at every boundary.

**Problems with leaking database types:**
- Technology coupling (Prisma types end up in React components)
- Security risks (accidental leakage of sensitive fields)
- Fragile contracts between server and client

**Incorrect:**

```typescript
import type { User } from "@prisma/client";
function UserProfile({ user }: { user: User }) { ... } // Coupled to Prisma
```

**Correct:**

```typescript
// Define explicit DTO
interface UserDTO {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
}

function UserProfile({ user }: { user: UserDTO }) { ... } // Decoupled
```

**DTO Location:** `packages/lib/dto/`

**Naming:**
- Base: `{Entity}Dto` (e.g., `PostDto`)
- With relations: `{Entity}With{Relations}Dto` (e.g., `PostWithCategoriesDto`)
- Enum pattern — use string literal unions to stay ORM-agnostic:

```typescript
// Good
export type PostStatusDto = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
// Bad
import { PostStatus } from "@prisma/client";
```

**Prisma Boundaries:**
- **Allowed**: `packages/prisma`, `packages/features/**/repositories/`
- **Not allowed**: `packages/features/**` services, `packages/trpc/**`, `apps/web/**`, `apps/api/**`
