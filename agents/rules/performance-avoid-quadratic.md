---
title: Avoid O(n²) Algorithms
impact: HIGH
tags: performance, algorithms
---

## Avoid Quadratic Complexity

Watch for O(n²) patterns, especially with database queries in loops:

```typescript
// ❌ Bad — N+1 query
for (const post of posts) {
  const author = await userRepo.findById(post.authorId); // N queries!
}

// ✅ Good — batch query
const authorIds = [...new Set(posts.map(p => p.authorId))];
const authors = await userRepo.findByIds(authorIds); // 1 query
const authorMap = new Map(authors.map(a => [a.id, a]));
```
