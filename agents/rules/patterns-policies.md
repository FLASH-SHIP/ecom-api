---
title: Policy-Based Security & Fine-Grained Authorization
impact: HIGH
impactDescription: Centralizes authorization logic into domain-driven policy objects
tags: patterns, security, authorization, policies
---

## Policy-Based Security & Fine-Grained Authorization

**Impact: HIGH**

Authorization checks that involve examining a specific database entity (e.g. *"an editor can only update their own post"*) must be encapsulated inside **Policy** objects rather than inline-coded in controllers, procedures, or service handlers.

### Incorrect (Inline Access Check Pollution)

```typescript
// BAD: Access check logic duplicated inside a router or procedure handler
export const update = authedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const post = await getPostService().getPost(input.id);
    
    // BAD: Duplicated access check leaking into API layer
    if (ctx.user.role !== "ADMIN" && post.authorId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    
    return getPostService().updatePost(input.id, input);
  });
```

### Correct (Policy Isolation & Middleware Execution)

Define a domain policy object inside `policies/`:

```typescript
// packages/features/blog/policies/PostPolicy.ts
export const PostPolicy = {
  canUpdate(user: AuthUser, post: ResourceWithAuthor): boolean {
    if (user.permissions.includes("blog.posts.update")) return true;
    return user.permissions.includes("blog.posts.update_own") && post.authorId === user.id;
  }
};
```

Apply via tRPC middleware or controller guards:

```typescript
// packages/trpc/server/routers/viewer/posts/procedures/posts.handler.ts
export const update = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(requirePostPolicy("canUpdate")) // GOOD: Policy logic abstracted as middleware
  .input(updateInputSchema)
  .mutation(async ({ input }) => {
    return getPostService().updatePost(input.id, input);
  });
```

### Policy Guidelines

1. **Clean Export**: Export policies as plain JavaScript objects containing validator methods instead of classes with static-only members.
2. **Framework Agnostic**: Keep Policy files in `packages/features/` so they are fully decoupled from Next.js, NestJS, and tRPC dependencies and can be reused in any environment.
3. **Fail-Closed**: Always default to returning `false` if none of the explicit permit conditions are met.
