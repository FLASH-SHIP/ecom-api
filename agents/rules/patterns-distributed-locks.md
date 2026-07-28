---
title: Distributed Lock Manager
impact: HIGH
impactDescription: Prevents concurrent modifications and race conditions under heavy traffic
tags: patterns, redis, lock, concurrency
---

## Distributed Lock Manager

This pattern has a **high** architectural impact. In high-concurrency environments, avoid parallel requests modifying the same resource simultaneously (such as inventory, checkout orders, or CMS workflow state). Doing so leads to the **Lost Update** problem or race conditions.

Always use a Redis-backed Distributed Lock to serialise concurrent updates on a per-resource basis.

### Incorrect (No Concurrency Control)

```typescript
// BAD: Two requests reading stock=1 concurrently will both succeed, causing double-selling
async reduceStock(productId: number, qty: number) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (product.stock >= qty) {
    await prisma.product.update({
      where: { id: productId },
      data: { stock: product.stock - qty }
    });
  }
}
```

### Correct (Distributed Locking)

Wrap critical mutations in `lockManager.runWithLock()` to lock resources during execution:

```typescript
import { lockManager } from "@flash-ship/ecom-lib/lock";

async reduceStock(productId: number, qty: number) {
  return lockManager.runWithLock(`product:stock:${productId}`, 3000, async () => {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (product.stock < qty) throw new Error("Out of stock");
    
    return prisma.product.update({
      where: { id: productId },
      data: { stock: product.stock - qty }
    });
  });
}
```

### Key Guidelines

1. **Granular Keys**: Lock keys should be as narrow and specific as possible (e.g. `order:update:${id}`, not `orders:update`).
2. **Safe Lock Release**: Release locks using a Lua script to ensure workers only release locks that they actually own (safeguard against expired lock overrides).
3. **Reasonable TTL**: Lock timeouts (TTL) should be short (e.g. 2 to 5 seconds) to prevent locking up routes if workers crash.
4. **Mock Fallback**: In test runs or when Redis is down, lock manager must fall back to direct callback execution instead of throwing connection crashes.
