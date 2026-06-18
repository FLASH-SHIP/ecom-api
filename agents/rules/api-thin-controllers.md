---
title: Keep Controllers Thin - HTTP Concerns Only
impact: HIGH
impactDescription: Enables technology-agnostic business logic
tags: api, controllers, http, separation-of-concerns
---

## Keep Controllers Thin - HTTP Concerns Only

**Impact: HIGH**

Controllers (tRPC procedures and NestJS controllers) are thin layers that handle only HTTP concerns. No business logic should exist in API routes or tRPC handlers.

**Controller responsibilities (and ONLY these):**
- Receive and validate incoming requests
- Extract data from request parameters, body, headers
- Call appropriate application services
- Return responses with proper status codes

**Controllers should NOT:**
- Contain business logic or domain rules
- Directly access databases or external services
- Perform complex data transformations

**Incorrect (business logic in controller):**

```typescript
// tRPC — BAD
export const postRouter = router({
  publish: authedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const post = await prisma.post.findUnique({ where: { id: input.id } });
    if (post.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    if (post.status === "PUBLISHED") throw new TRPCError({ code: "BAD_REQUEST" });
    return prisma.post.update({ where: { id: input.id }, data: { status: "PUBLISHED" } });
  }),
});
```

**Correct (thin controller):**

```typescript
// tRPC — GOOD
export const postRouter = router({
  publish: authedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const postService = getPostService();
    return postService.publishPost(input.id, ctx.user.id);
  }),
});

// NestJS — GOOD
@Post(":id/publish")
@UseGuards(ApiAuthGuard)
async publish(@Param("id") id: number, @GetUser() user) {
  return this.postService.publishPost(id, user.id);
}
```
