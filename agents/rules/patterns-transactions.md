---
title: Declarative Transactions via AsyncLocalStorage
impact: HIGH
impactDescription: Ensures data integrity for multi-step database operations without polluting repository parameters
tags: patterns, prisma, transactions, context
---

## Declarative Transactions via AsyncLocalStorage

**Impact: HIGH**

When writing multi-step write/update operations in service handlers, you must ensure they run inside a database transaction to preserve database integrity. To keep repository constructors clean, use `runInTransaction()` to manage transaction scopes.

### Incorrect (Polluting Repository Methods with Transaction Parameter)

```typescript
// BAD: Repository methods forced to accept optional tx parameter
class PostRepository {
  async update(id: number, data: any, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.post.update({ where: { id }, data });
  }
}

// BAD: Manually passing the transaction client instance
await prisma.$transaction(async (tx) => {
  await postRepo.update(id, data, tx);
  await auditLogRepo.log(action, tx);
});
```

### Correct (Transparent Proxy Context Transactions)

```typescript
// GOOD: Repositories reference the proxied global prisma instance directly
class PostRepository {
  constructor(private prisma: PrismaClient) {} // Inherently uses the transaction proxy

  async update(id: number, data: any) {
    return this.prisma.post.update({ where: { id }, data });
  }
}

// GOOD: Services wrap atomic workflows in runInTransaction
import { runInTransaction } from "@ecom/prisma";

export class PostService {
  async updatePost(id: number, data: any) {
    return runInTransaction(async () => {
      // Both queries automatically run inside the same transaction
      const post = await this.deps.postRepo.update(id, data);
      await this.deps.auditLogRepo.log("UPDATE", id);
      return post;
    });
  }
}
```

### Transaction Guidelines

1. **Transactional Mutators**: Any service method performing more than one database write operation (directly or via nested helper calls) must be wrapped in `runInTransaction()`.
2. **Propagation**: Nested `runInTransaction()` calls automatically join the existing transaction (PROPAGATION_REQUIRED behavior).
3. **No Direct $transaction**: Avoid calling `prisma.$transaction()` directly in services.
