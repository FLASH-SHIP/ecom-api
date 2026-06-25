---
title: REST Response Envelope Standardization
impact: MEDIUM
impactDescription: Standardizes all HTTP responses returned by NestJS controllers into a unified JSON format
tags: patterns, interceptor, response, standard-response, api-structure
---

## Standardize Responses via ResponseInterceptor

**Impact: MEDIUM**

To ensure client applications (mobile, frontend, extension) can handle responses predictably, do not wrap output JSON payloads manually in every controller method. Instead, use a global `ResponseInterceptor` to wrap all controller outputs in a standard JSON envelope structure.

A standard REST response envelope contains:
- `success`: Boolean indicating if the request succeeded.
- `data`: The main payload containing entities or return values.
- `meta`: (Optional) Pagination metadata (e.g. `total`, `page`, `perPage`).

---

## Pattern Implementation

The interceptor is registered globally in `AppModule` using `APP_INTERCEPTOR` or `main.ts` so that it intercepts all outgoing HTTP controller responses.

### Incorrect (Manually building success envelopes in controllers):

```typescript
// Bad: Redundant boilerplate wrapping in controller methods
@Get(':id')
async getComment(@Param('id') id: string) {
  const comment = await this.commentService.getComment(Number(id));
  return {
    success: true,
    data: comment,
  };
}
```

### Correct (Clean returns mapped dynamically by Interceptor):

**1. Clean Controller Methods:**
```typescript
@Get(':id')
async getComment(@Param('id') id: string) {
  const comment = await getCommentService().getComment(Number(id));
  return comment; // Controller returns the direct entity/value
}
```

**2. ResponseInterceptor Envelope Mapping:**
- If the return value contains a `success` field, it returns it directly.
- If the return value is an object containing `data` (and optionally `meta`), it appends `success: true`.
- Otherwise, it wraps the return value in a `{ success: true, data: val }` envelope automatically.

---

## Common Mistakes to Avoid

*   **Mistake 1: Intercepting Swagger docs or static downloads**
    Ensure the interceptor skips routing endpoints that return HTML/Static documentation (like `/docs` or `/swagger`) or custom file streams, which would break display rendering in browsers.
*   **Mistake 2: Manual nesting under "data" when not required**
    If a controller method returns `{ data: { foo: "bar" } }`, the interceptor will automatically produce `{ success: true, data: { foo: "bar" } }`. Do not double-nest it manually in the controller as `{ data: { data: ... } }`.
