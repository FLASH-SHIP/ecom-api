---
title: Import Patterns and Named Exports
impact: MEDIUM
tags: quality, imports, exports
---

## Import Patterns

### Type imports
```typescript
// ✅ Always use `import type` for type-only imports
import type { User } from "@prisma/client";
import type { PostDto } from "@flash-ship/ecom-lib/dto/PostDto";
```

### Named exports over default exports
```typescript
// ✅ Good — named export
export class PostService { ... }
export function getPostService() { ... }

// ❌ Bad — default export (harder to refactor, inconsistent naming)
export default class PostService { ... }
```

### Direct path imports
```typescript
// ✅ Good
import { Button } from "@flash-ship/ecom-ui/components/button";

// ❌ Bad — barrel import
import { Button } from "@flash-ship/ecom-ui";
```
