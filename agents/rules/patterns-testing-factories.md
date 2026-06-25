---
title: Use Model Factories for Automated Testing
impact: MEDIUM
impactDescription: Simplifies test fixtures arrangement and prevents schema-change breakage
tags: patterns, testing, factories, prisma
---

## Use Model Factories for Automated Testing

**Impact: MEDIUM**

When writing unit, integration, and E2E tests, do not write raw Prisma creation queries or mock complex relational schemas manually. Instead, use centralized **Model Factories** to generate default fixtures that can be selectively overridden.

### Incorrect (Relational Boilerplate Duplication)

```typescript
// BAD: Manual, verbosely duplicated data setup inside individual test files
it("should compute stats", async () => {
  const author = await prisma.user.create({
    data: {
      email: "test@ecom.com",
      name: "Author",
      password: { create: { hash: "xxx" } },
    }
  });

  const post = await prisma.post.create({
    data: {
      title: "Title",
      slug: "title-slug",
      authorId: author.id,
      status: "DRAFT",
    }
  });
});
```

### Correct (Fluent Model Factories)

```typescript
import { UserFactory } from "@ecom/prisma";
import { PostFactory } from "@ecom/prisma";

it("should compute stats", async () => {
  // GOOD: Auto-generates correct nested relationships and dummy values
  const author = await UserFactory.create({ name: "Custom Name" });
  const post = await PostFactory.create({ authorId: author.id });
});
```

### Testing Factory Guidelines

1. **Deterministic Randomness**: Generate defaults using unique random strings (e.g. `Math.random().toString(36)`) or faker to avoid unique database constraint conflicts during concurrent test runs.
2. **Support Unchecked Inputs**: Allow passing partial custom fields (`Partial<Prisma.ModelCreateInput>`) to factory methods to support relational overrides.
3. **Seeding vs Building**: Support both `.build()` (returns raw Javascript objects for mocking/unit-testing) and `.create()` (persists to test database for integration testing).
