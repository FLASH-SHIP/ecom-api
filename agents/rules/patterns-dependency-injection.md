---
title: Use Dependency Injection for Loose Coupling
impact: HIGH
impactDescription: Enables build-time safety, testability, and maintainability
tags: patterns, dependency-injection, di, testing, coupling
---

## Use Dependency Injection for Loose Coupling

**Impact: HIGH**

Dependency Injection enables loose coupling, facilitates testing, and isolates concerns. Dependencies should be injected via DI containers rather than instantiated directly within classes.

**Incorrect (tight coupling with direct instantiation):**

```typescript
class PostService {
  private repository = new PostRepository();
  private emailService = new EmailService();

  async publishPost(postId: number) {
    const post = await this.repository.findById(postId);
    await this.emailService.sendNotification(post);
    return this.repository.updateStatus(postId, "PUBLISHED");
  }
}
```

**Correct (dependency injection):**

```typescript
export interface IPostServiceDeps {
  postRepo: PostRepository;
  emailService: EmailService;
}

export class PostService {
  constructor(private deps: IPostServiceDeps) {}

  async publishPost(postId: number) {
    const post = await this.deps.postRepo.findById(postId);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");
    await this.deps.emailService.sendNotification(post);
    return this.deps.postRepo.updateStatus(postId, "PUBLISHED");
  }
}
```

## DI Structure per Feature

Each feature has a `di/` directory:

```
packages/features/blog/
├── di/
│   ├── tokens.ts              # DI token symbols
│   ├── PostService.module.ts  # Module binding
│   └── PostService.container.ts # Container + getter
├── services/
│   └── PostService.ts
├── repositories/
│   └── PostRepository.ts
└── types.ts
```

### Step 1: Create tokens

```typescript
// packages/features/blog/di/tokens.ts
export const BLOG_DI_TOKENS = {
  POST_SERVICE: Symbol("PostService"),
  POST_SERVICE_MODULE: Symbol("PostServiceModule"),
  POST_REPOSITORY: Symbol("PostRepository"),
  POST_REPOSITORY_MODULE: Symbol("PostRepositoryModule"),
};
```

### Step 2: Define the service class with constructor injection

For services with multiple dependencies, use a dependencies interface:

```typescript
// packages/features/blog/services/PostService.ts
export interface IPostServiceDeps {
  postRepo: PostRepository;
  categoryRepo: CategoryRepository;
}

export class PostService {
  constructor(private deps: IPostServiceDeps) {}

  async getById(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");
    return post;
  }
}
```

For repositories with a single dependency, pass it directly:

```typescript
// packages/features/blog/repositories/PostRepository.ts
export class PostRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: number) {
    return this.prisma.post.findUnique({
      where: { id },
      select: { id: true, title: true, slug: true, status: true }
    });
  }
}
```

### Step 3: Create a module file

```typescript
// packages/features/blog/di/PostService.module.ts
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@ecom/features/di/di";
import { PostService } from "@ecom/features/blog/services/PostService";
import { moduleLoader as postRepoModuleLoader } from "./PostRepository.module";
import { moduleLoader as categoryRepoModuleLoader } from "./CategoryRepository.module";
import { BLOG_DI_TOKENS } from "./tokens";

const thisModule = createModule();

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken: BLOG_DI_TOKENS.POST_SERVICE_MODULE,
  token: BLOG_DI_TOKENS.POST_SERVICE,
  classs: PostService,
  depsMap: {
    postRepo: postRepoModuleLoader,
    categoryRepo: categoryRepoModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token: BLOG_DI_TOKENS.POST_SERVICE,
  loadModule,
};
```

### Step 4: Create a container

```typescript
// packages/features/blog/di/PostService.container.ts
import { createContainer } from "@ecom/features/di/di";
import { type PostService, moduleLoader } from "./PostService.module";

const container = createContainer();

export function getPostService(): PostService {
  moduleLoader.loadModule(container);
  return container.get<PostService>(moduleLoader.token);
}
```

### Step 5: Use the service

```typescript
import { getPostService } from "@ecom/features/blog/di/PostService.container";

const postService = getPostService();
await postService.publishPost(42);
```

## Common Mistakes to Avoid

**Mistake 1: Static methods bypass DI**
```typescript
// Bad
export class PostRepository {
  static async findById(id: number) { ... }
}
// Good — use instance methods
export class PostRepository {
  constructor(private prisma: PrismaClient) {}
  async findById(id: number) { ... }
}
```

**Mistake 2: Manual instantiation**
```typescript
// Bad
const repo = new PostRepository(prisma);
const service = new PostService({ postRepo: repo });
// Good — use container getter
const service = getPostService();
```

**Mistake 3: Importing Prisma in services**
```typescript
// Bad — service knows about Prisma
import prisma from "@ecom/prisma";
export class PostService {
  async getPost(id: number) { return prisma.post.findUnique({...}); }
}
// Good — service uses injected repository
export class PostService {
  constructor(private deps: IPostServiceDeps) {}
  async getPost(id: number) { return this.deps.postRepo.findById(id); }
}
```
