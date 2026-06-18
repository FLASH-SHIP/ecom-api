---
title: Repository Method Naming Conventions
impact: HIGH
impactDescription: Improves code discoverability and reusability
tags: data, repository, naming, conventions
---

## Repository Method Naming Conventions

**Impact: HIGH**

### Rule 1: Don't include entity name in method names

```typescript
// Good
class PostRepository {
  findById(id: number) { ... }
  findBySlug(slug: string) { ... }
}
// Bad
class PostRepository {
  findPostById(id: number) { ... }
}
```

### Rule 2: Use `include` keyword for relational data

```typescript
// Good
findByIdIncludeCategories(id: number) { ... }
findByIdIncludeAuthor(id: number) { ... }
// Bad
findByIdFull(id: number) { ... }
```

### Rule 3: Keep methods generic — avoid use-case names

```typescript
// Good
findByAuthorIdIncludeTags(authorId: number) { ... }
// Bad
findPostsForDashboard(authorId: number) { ... }
```

### Rule 4: No business logic in repositories

Repositories handle data access only. Business logic belongs in Services.
