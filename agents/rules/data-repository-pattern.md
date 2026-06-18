---
title: Isolate Technology Choices Behind Repositories
impact: CRITICAL
impactDescription: Enables technology changes without codebase-wide refactors
tags: data, repository, prisma, orm, isolation
---

## Isolate Technology Choices Behind Repositories

**Impact: CRITICAL**

Technology choices must not seep through the application. All database access must go through Repository classes.

**Incorrect (Prisma leaking throughout codebase):**

```typescript
// In a service file — BAD
import { prisma } from "@ecom/prisma";

async function getPost(id: number) {
  return prisma.post.findFirst({
    where: { id },
    include: { author: true }
  });
}
```

**Correct (Repository abstraction):**

```typescript
// In repository file
import { prisma } from "@ecom/prisma";

export class PostRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: number) {
    return this.prisma.post.findFirst({
      where: { id },
      select: { id: true, title: true, slug: true, authorId: true }
    });
  }
}

// In service file — no Prisma knowledge
export class PostService {
  constructor(private deps: IPostServiceDeps) {}

  async getPost(id: number) {
    return this.deps.postRepo.findById(id);
  }
}
```

**The standard:**
- All database access must go through Repository classes
- Repositories are the only code that knows about Prisma (or any other ORM)
- No business logic should be in repositories
- Repositories are injected via Dependency Injection containers

**Benefits:**
If we ever switch from Prisma to Drizzle or another ORM, the only changes required are:
- Repository implementations
- DI container wiring for new repositories
- Nothing else in the codebase should care or change
