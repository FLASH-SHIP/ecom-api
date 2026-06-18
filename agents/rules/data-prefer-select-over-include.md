---
title: Use select Instead of include in Prisma Queries
impact: HIGH
impactDescription: Prevents over-fetching and accidental exposure of sensitive data
tags: data, prisma, select, performance, security
---

## Use `select` Instead of `include` in Prisma Queries

**Impact: HIGH**

Always use `select` to explicitly specify which fields to fetch. Never use `include` as it fetches all fields, including potentially sensitive ones.

```typescript
// ✅ Good
const user = await prisma.user.findFirst({
  select: { id: true, name: true, email: true }
});

// ❌ Bad — fetches all fields including password hash, tokens, etc.
const user = await prisma.user.findFirst({
  include: { password: true }
});
```
