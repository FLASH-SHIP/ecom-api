---
title: Transactional Outbox Pattern
impact: HIGH
impactDescription: Guarantees reliable, eventual consistency event delivery and decoupling
tags: patterns, outbox, database, transactions
---

## Transactional Outbox Pattern

This pattern has a **high** architectural impact. In Event-Driven Architecture (EDA), never publish domain events directly to an external system (like Kafka, RabbitMQ, Redis, or SNS) during request execution. If the database transaction commits successfully but the event bus fails, your system enters an inconsistent state.

Always write domain events to an `OutboxEvent` database table **within the same database transaction** as the primary entity write. A dedicated background worker polls this outbox table and publishes events asynchronously.

### Incorrect (Unreliable Event Publishing)

```typescript
// BAD: If database succeeds but eventBus throws, or vice versa, data becomes inconsistent
async createPost(data: any) {
  const post = await prisma.post.create({ data });
  await eventBus.publish("post.created", { postId: post.id }); // DANGER
  return post;
}
```

### Correct (Atomic Persistence)

1. **Write to Outbox Table inside Transaction**:

```typescript
import { OutboxStore } from "@ecom/features/events/OutboxStore";
import { runInTransaction } from "@ecom/prisma";

async createPost(data: any) {
  return runInTransaction(async () => {
    const post = await prisma.post.create({ data });

    // Atomically saved in outbox_events table in the same transaction
    await OutboxStore.publish("post.created", {
      postId: post.id,
      title: post.title,
      authorId: post.authorId,
    });

    return post;
  });
}
```

1. **Background Polling & Publishing**:

Implement a background job (`OutboxWorker`) to process the outbox events:

```typescript
// Query PENDING events, dispatch via EventBus, and mark as SENT
const events = await prisma.outboxEvent.findMany({
  where: { status: "PENDING" },
  take: 20,
});
for (const event of events) {
  await eventBus.emit(event.event, event.payload);
  await prisma.outboxEvent.update({
    where: { id: event.id },
    data: { status: "SENT", processedAt: new Date() },
  });
}
```

### Key Guidelines

1. **Transaction Wrapping**: Always wrap outbox creation in the active database transaction.
2. **At-Least-Once Delivery**: The background worker ensures at-least-once delivery. Responding event listeners must be idempotent to handle potential duplicate events.
3. **Outbox Polling**: Limit the take parameter when polling database rows to avoid high memory spikes.
