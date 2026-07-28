---
title: Avoid index.ts Barrel Imports
impact: MEDIUM
tags: quality, imports, barrel
---

## Avoid Barrel Imports

Import from source files directly, not barrel `index.ts` files:

```typescript
// ✅ Good
import { Button } from "@flash-ship/ecom-ui/components/button";
import { PostService } from "@ecom/features/blog/services/PostService";

// ❌ Bad
import { Button } from "@flash-ship/ecom-ui";
import { PostService } from "@ecom/features/blog";
```

Barrel imports cause larger bundle sizes and circular dependency issues.
