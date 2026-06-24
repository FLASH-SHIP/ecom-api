---
title: Dynamic Data Filtering & Specification Query Builder
impact: MEDIUM
impactDescription: Standardises pagination, filtering, and sorting API logic, reducing boilerplate
tags: patterns, prisma, specification, filter
---

## Dynamic Data Filtering & Specification Query Builder

This pattern has a **medium** architectural impact. Avoid writing repeated conditional statements in your query/listing methods to manually construct Prisma `where`, `orderBy`, `skip`, and `take` clauses from URL query parameters. This leads to duplicate boilerplate and inconsistency between resources.

Use a standardized `PrismaQueryBuilder` utility to map URL request criteria to type-safe database queries.

### Incorrect (Duplicated Query Mapping Boilerplate)

```typescript
// BAD: Boilerplate nested if/else statements mapping queries to Prisma
async listPosts(query: any) {
  const where: any = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search } },
      { content: { contains: query.search } }
    ];
  }
  const skip = (query.page - 1) * query.limit;
  return prisma.post.findMany({ where, skip, take: query.limit });
}
```

### Correct (Standardised Query Builder)

Implement and call the builder to parse query options:

```typescript
import { PrismaQueryBuilder } from "@ecom/features/shared/PrismaQueryBuilder";

async listPosts(options: QueryOptions) {
  const queryArgs = PrismaQueryBuilder.build({
    page: options.page,
    limit: options.limit,
    sort: options.sort, // e.g. "-createdAt" -> orderBy: { createdAt: "desc" }
    filter: options.filter, // e.g. { status: "PUBLISHED" }
    search: options.search,
    searchFields: ["title", "excerpt"]
  });

  return prisma.post.findMany(queryArgs);
}
```

### Key Guidelines

1. **Case-Insensitive Search**: Always configure `mode: "insensitive"` in Prisma's `contains` queries to avoid Postgres case mismatch problems.
2. **Standard Pagination**: Cap pagination limits to protect server resources (e.g. limit ranges between 1 and 100).
3. **Sort Prefix Convention**: Use the standard negative prefix (e.g. `-createdAt`) for descending order and the raw field name (e.g. `createdAt`) for ascending order.
