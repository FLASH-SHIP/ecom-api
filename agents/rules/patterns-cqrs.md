---
title: Command Query Responsibility Segregation (CQRS)
impact: MEDIUM
impactDescription: Keeps complex business logic separated from read-only listing queries
tags: patterns, cqrs, architecture, features
---

## Command Query Responsibility Segregation (CQRS)

**Impact: MEDIUM**

In complex feature areas, avoid bloating a single service class with both intensive write/update operations and high-throughput read-only listing queries. Segregate feature operations into **Commands** and **Queries**, using the main service as a backward-compatible facade.

### Incorrect (Bloated Service Class)

```typescript
// BAD: Massive service file mixing transaction-heavy writes with read searches
export class PostService {
  async getPost(id: number) { ... }
  async listPosts(options: any) { ... } // reads
  async createPost(data: any) { ... } // writes
  async updatePost(id: number, data: any) { ... } // writes
  async permanentlyDeletePost(id: number) { ... } // writes
}
```

### Correct (CQRS Segregation + Facade Wrapper)

Organize files into `commands/` and `queries/` directories under the feature module:

```
packages/features/blog/
├── commands/
│   └── PostCommands.ts        # Writes, transactions, event triggers
├── queries/
│   └── PostQueries.ts         # Fast reads, listing parameters mapping
└── services/
    └── PostService.ts         # Facade wrapper importing commands/queries
```

Implement the Service Facade:

```typescript
import { PostQueries } from "../queries/PostQueries";
import { PostCommands } from "../commands/PostCommands";

export class PostService {
  private queries: PostQueries;
  private commands: PostCommands;

  constructor(deps: IPostServiceDeps) {
    this.queries = new PostQueries({ postRepo: deps.postRepo });
    this.commands = new PostCommands(deps);
  }

  // Fast read-only query
  async listPosts(options: any) {
    return this.queries.listPosts(options);
  }

  // Transaction-heavy command
  async createPost(data: any) {
    return this.commands.createPost(data);
  }
}
```

### CQRS Guidelines

1. **Write Actions (Commands)**: Mutators that write to the database, emit event messages, or run revisions belong in Command classes. Wrap them in transactions.
2. **Read Actions (Queries)**: Fetchers that retrieve listings or view details belong in Query classes. They must not write to the database.
3. **Facade Cleanliness**: Keep the facade class clean and direct, simply forwarding arguments to delegate classes without introducing nested logic.
