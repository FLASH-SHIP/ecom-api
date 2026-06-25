---
title: Decouple Side-Effects using the EventBus
impact: HIGH
impactDescription: Eliminates domain coupling and optimizes response times
tags: patterns, event-bus, eda, decoupling
---

## Decouple Side-Effects using the EventBus

**Impact: HIGH**

E-commerce operations often trigger secondary side-effects (e.g. clearing caches, sending emails, notifying external platforms). Services should emit typed events using the centralized `eventBus` instead of importing and invoking unrelated services directly.

### Incorrect (Direct Invocation / Tight Coupling)

```typescript
export class PostService {
  constructor(private deps: IPostServiceDeps) {}

  async publishPost(id: number) {
    const post = await this.deps.postRepo.update(id, { status: "PUBLISHED" });
    
    // BAD: Tight coupling to cache and email modules
    await this.deps.cacheService.clearPostCache(post.slug);
    await this.deps.emailService.sendNotification(post.authorId);
    
    return post;
  }
}
```

### Correct (Event Emission / Decoupled Listeners)

```typescript
export class PostService {
  constructor(private deps: IPostServiceDeps) {}

  async publishPost(id: number) {
    const post = await this.deps.postRepo.update(id, { status: "PUBLISHED" });
    
    // GOOD: Emit a typed event and let listeners handle side-effects
    eventBus.emit("post.published", {
      postId: post.id,
      slug: post.slug,
      authorId: post.authorId,
    }).catch(() => {});
    
    return post;
  }
}
```

### Event Registration Guidelines

1. **Typed Event Definition**: Declare all events and their payloads inside the `EventMap` interface in `packages/features/events/EventBus.ts`.
2. **Central Registry**: Register listener subscriptions inside `packages/features/events/listeners.ts`.
3. **Async Processing**: Ensure event handlers are resilient by wrapping execution in async try-catch blocks so a failure in a side-effect does not interrupt the main request flow.
