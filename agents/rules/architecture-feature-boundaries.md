---
title: Feature Boundaries
impact: HIGH
impactDescription: Maintains clean module boundaries and prevents spaghetti dependencies
tags: architecture, features, boundaries, coupling
---

## Feature Boundaries

**Impact: HIGH**

Each feature in `packages/features/` is a self-contained module. Features should minimize cross-feature dependencies.

### Rules

1. **Features can depend on** `packages/lib`, `packages/prisma`, `packages/types`, `packages/config`
2. **Features should NOT import from** other features directly — use DI or event emitters for cross-feature communication
3. **If two features need shared logic**, extract it to `packages/lib/` or create a shared sub-module
4. **Features should NOT import from** `packages/trpc` or `apps/` — features are API-layer agnostic

### Dependency direction

```
apps/web → packages/trpc → packages/features → packages/prisma
apps/api → packages/features → packages/prisma
                ↕
          packages/lib (utilities)
```
