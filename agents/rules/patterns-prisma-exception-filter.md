---
title: Database Exception Mapping
impact: HIGH
impactDescription: Prevents leaking raw database driver stack traces to clients and maps query errors to clean HTTP responses
tags: patterns, prisma, exceptions, filter, http-exceptions, security
---

## Use Prisma Exception Filter for Clean API Boundaries

**Impact: HIGH**

Never allow raw database exceptions (like Prisma stack traces) to bubble up to client responses. Leaking raw query/adapter errors represents a significant security risk (exposing schema structures) and results in generic HTTP 500 errors instead of informative client responses.

Use the `PrismaClientExceptionFilter` globally to capture `PrismaClientKnownRequestError` exceptions and translate them into standardized HTTP responses.

---

## Mapped Constraints and Codes

The global filter translates the following Prisma errors:

| Prisma Code | Cause | Mapped HTTP Status | REST Response Message |
|-------------|-------|--------------------|-----------------------|
| **P2002** | Unique Constraint Violation | `409 Conflict` | Unique constraint violation: record already exists. |
| **P2025** | Target Record Not Found | `404 Not Found` | Record not found. |
| **P2003** | Foreign Key Constraint Failed | `400 Bad Request` | Foreign key constraint failed. |

---

## Pattern Implementation

### Incorrect (Letting Prisma errors bubble up):

```typescript
// Bad: If id does not exist, Prisma throws P2025 which results in HTTP 500 containing internal database traces
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.prisma.post.findUniqueOrThrow({ where: { id: Number(id) } });
}
```

### Correct (Global Exception Mapping):

The filter is registered globally in `main.ts`:
```typescript
import { HttpAdapterHost } from "@nestjs/core";
import { PrismaClientExceptionFilter } from "./common/filters/prisma-client-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const { httpAdapter } = app.get(HttpAdapterHost);
  
  app.useGlobalFilters(
    new PrismaClientExceptionFilter(httpAdapter),
    // ...other filters
  );
}
```

This guarantees that any service or repository performing database queries that throw constraint failures are instantly caught and mapped without needing manual `try-catch` blocks in controllers or services.

---

## Common Mistakes to Avoid

*   **Mistake 1: Duplicate try-catch wrapping in services**
    Do not wrap database calls in generic try-catch blocks simply to throw an HTTP Exception (e.g. throwing `ConflictException` on duplicate email inserts). Let Prisma throw natively; the filter handles it globally, maintaining clean service layers.
*   **Mistake 2: Missing HTTP Adapter injection**
    Since the exception filter needs to resolve Express response operations, make sure to instantiate it by passing the `httpAdapter` from the `HttpAdapterHost` inside `main.ts`.
