---
title: Dual API Architecture - tRPC (Internal) + NestJS REST (External)
impact: CRITICAL
impactDescription: Ensures proper separation between internal and external API consumers
tags: architecture, api, trpc, nestjs, rest
---

## Dual API Architecture

**Impact: CRITICAL**

Ecom serves multiple client types. The architecture uses **two API layers**, each optimized for its consumers:

| API Layer | Technology | Clients | Use Case |
|-----------|-----------|---------|----------|
| **tRPC** (Internal) | tRPC v11 + SuperJSON | Admin Web (`apps/web`) | End-to-end type safety, SSR |
| **REST API v2** (External) | NestJS + Swagger | Mobile, Chrome Extension, Public | Standard HTTP REST for non-TS clients |

**Both layers share the same business logic** from `packages/features/`:

```
apps/web (Next.js) ──tRPC──→ packages/trpc → packages/features → packages/prisma
apps/api (NestJS)  ──import──→ packages/features → packages/prisma
```

### Rules

1. **Business logic lives in `packages/features/`** — never duplicate logic between tRPC and NestJS
2. **tRPC routers** call services from `packages/features/`
3. **NestJS controllers** also call the same services from `packages/features/`
4. **Input validation**: Zod schemas shared between tRPC input and NestJS DTOs
5. **Response shaping**: Both layers use Prisma `select` for consistent data shape

### Incorrect (duplicated logic):

```typescript
// tRPC router
export const postRouter = router({
  getById: authedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    // BAD: Business logic directly in router
    const post = await prisma.post.findUnique({ where: { id: input.id } });
    if (!post) throw new TRPCError({ code: "NOT_FOUND" });
    return post;
  }),
});

// NestJS controller — duplicated logic!
@Get(":id")
async getById(@Param("id") id: number) {
  const post = await this.prisma.post.findUnique({ where: { id } });
  if (!post) throw new NotFoundException();
  return post;
}
```

### Correct (shared service):

```typescript
// packages/features/blog/services/PostService.ts
export class PostService {
  constructor(private deps: IPostServiceDeps) {}

  async getById(id: number) {
    const post = await this.deps.postRepo.findById(id);
    if (!post) throw ErrorWithCode.Factory.NotFound("Post not found");
    return post;
  }
}

// tRPC router — thin wrapper
export const postRouter = router({
  getById: authedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const postService = getPostService();
    return postService.getById(input.id);
  }),
});

// NestJS controller — thin wrapper
@Get(":id")
async getById(@Param("id") id: number) {
  return this.postService.getById(id);
}
```
