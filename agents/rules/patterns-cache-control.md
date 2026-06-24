---
title: Cache-Control Header Injection
impact: MEDIUM
impactDescription: Enhances API performance and reduces server load by leveraging browser/CDN caching
tags: patterns, caching, cache-control, interceptor, performance
---

## Use Cache-Control Interceptor for Endpoint Caching

**Impact: MEDIUM**

Public endpoints that serve relatively static or slow-changing data (like blog post list/detail views, active categories, or global settings) should leverage standard HTTP caching. This reduces database queries and improves API load times.

Use the `CacheControlInterceptor` to inject `Cache-Control: public, max-age=60` headers dynamically.

---

## Pattern Implementation

The interceptor can be applied at the controller class level (applying to all routes in the controller) or at individual route handler levels.

### Incorrect (No caching headers or manually writing headers in every route):

```typescript
// Bad: Manual header setting cluttering route logic
@Get('posts')
async listPosts(@Res() res: Response) {
  const posts = await this.blogService.getPosts();
  res.setHeader("Cache-Control", "public, max-age=60");
  return res.json(posts);
}
```

### Correct (CacheControlInterceptor Decoration):

```typescript
import { Controller, Get, UseInterceptors } from "@nestjs/common";
import { CacheControlInterceptor } from "../../common/interceptors/cache-control.interceptor";

@Controller("blog")
@UseInterceptors(CacheControlInterceptor) // Applies 60-second caching to all endpoints
export class BlogController {
  @Get("posts")
  async listPosts() {
    return this.postService.listPosts();
  }

  // To set a custom cache duration, override the interceptor configuration at method level
  @Get("featured")
  @UseInterceptors(new CacheControlInterceptor(300)) // 5 minutes cache
  async getFeatured() {
    return this.postService.getFeatured();
  }
}
```

---

## Common Mistakes to Avoid

*   **Mistake 1: Caching private/authenticated endpoints**
    Never apply `CacheControlInterceptor` on routes that serve personalized or user-specific data (e.g. `/users/me`, `/orders`). Doing so can result in CDNs caching sensitive user payloads and serving them to other clients.
*   **Mistake 2: Using it for volatile data**
    Avoid long cache lifetimes for endpoints where immediate updates are expected. Keep the default cache duration conservative (e.g. 60 seconds) to balance performance with content freshness.
