---
title: Code Comment Guidelines
impact: MEDIUM
tags: quality, comments, documentation
---

## Code Comment Guidelines

Only add comments that explain **why**, not **what**.

```typescript
// ❌ Bad — restates what the code does
// Get the user
const user = await userRepo.findById(userId);

// ❌ Bad — obvious from the code
// Check if post is published
if (post.status === "PUBLISHED") { ... }

// ✅ Good — explains WHY
// Refresh token rotation: invalidate old token before issuing new one
// to prevent token replay attacks
await tokenRepo.revoke(oldTokenId);

// ✅ Good — non-obvious business rule
// Vietnamese slugs need special handling: "viết bài" → "viet-bai"
const slug = slugify(title, { locale: "vi" });
```
