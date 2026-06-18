---
title: Factory Pattern
impact: MEDIUM
tags: patterns, factory
---

## Factory Pattern

Use factories to create complex objects with proper defaults:

```typescript
export class PostFactory {
  static createDraft(data: CreatePostInput, authorId: number): CreatePostData {
    return {
      ...data,
      authorId,
      status: "DRAFT",
      slug: slugify(data.title, { locale: "vi" }),
      createdAt: new Date(),
    };
  }
}
```
