---
title: Automatic Auditing & Change History Logs
impact: MEDIUM
impactDescription: Automates audit logging and history tracking for compliance and rollback capability
tags: patterns, prisma, audit, middleware
---

## Automatic Auditing & Change History Logs

This pattern has a **medium** architectural impact. Do not write audit logs manually in every single REST/tRPC route or service write operation. Manual tracking is error-prone, hard to maintain, and leads to code clutter.

Instead, leverage **Prisma Client Extensions** (`$extends.query`) to intercept all database write operations globally, and write records to the `AuditLog` table using active user details stored in `AsyncLocalStorage`.

### Incorrect (Manual Service Auditing)

```typescript
// BAD: Manual audit logging cluttering the core business logic
async createPost(data: any, userId: number) {
  const post = await prisma.post.create({ data });
  await prisma.auditLog.create({
    data: { userId, action: "CREATE", entityType: "Post", entityId: post.id, newValues: post }
  });
  return post;
}
```

### Correct (Global Extension Auditing)

1. **User Context Interceptor**: Inject authenticated user IDs from requests into the store:

```typescript
// NestJS Interceptor
loggerContext.run({ userId: req.user.id, traceId }, () => {
  next.handle();
});
```

1. **Prisma Client Query Extension**: Intercept queries and log changes automatically:

```typescript
// packages/prisma/src/index.ts
const extendedPrisma = basePrisma.$extends({
  query: {
    $allModels: {
      async update({ model, args, query }) {
        const oldRecord = await basePrisma[model].findUnique({ where: args.where });
        const result = await query(args); // execute actual update
        
        const store = loggerContext.getStore();
        await basePrisma.auditLog.create({
          data: {
            userId: store?.userId || null,
            action: "UPDATE",
            entityType: model,
            entityId: String(result.id),
            oldValues: oldRecord,
            newValues: result
          }
        });
        return result;
      }
    }
  }
});
```

### Key Guidelines

1. **Loop Prevention**: Define `AUDIT_EXEMPT_MODELS` (e.g. `AuditLog`, `Session`, `RequestLog`) to immediately skip auditing and avoid infinite database save loops.
2. **Context Fallback**: When queries are run outside requests (like seed scripts or queues), fallback the `userId` to `null` or system defaults instead of throwing.
3. **Old/New Comparison**: For updates and deletions, fetch the old record first before executing the query to preserve change history diffs.
