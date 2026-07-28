---
title: Error Handling Patterns
impact: HIGH
impactDescription: Proper error handling ensures debuggable and secure code
tags: errors, trpc, nestjs, services, repositories
---

# Error Handling Patterns

## Descriptive Errors

```typescript
// ✅ Good - Descriptive error with context
throw new Error(`Unable to publish post: User ${userId} does not have permission for post ${postId}`);

// ❌ Bad - Generic error
throw new Error("Publish failed");
```

## ErrorWithCode vs TRPCError vs HttpException

Use the right error class based on **where** the code lives:

### In Non-API Files (services, repositories, utilities — `packages/features/`)

```typescript
import { ErrorCode } from "@flash-ship/ecom-lib/errorCodes";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";

// Option 1: Using constructor with ErrorCode enum
throw new ErrorWithCode(ErrorCode.PostNotFound, "Post not found");

// Option 2: Using the Factory pattern for common HTTP errors
throw ErrorWithCode.Factory.Forbidden("You don't have permission to edit this post");
throw ErrorWithCode.Factory.NotFound("Category not found");
throw ErrorWithCode.Factory.BadRequest("Invalid slug format");
```

### In tRPC Routers Only (`packages/trpc/`)

```typescript
import { TRPCError } from "@trpc/server";

throw new TRPCError({
  code: "NOT_FOUND",
  message: "Post not found",
});
```

The tRPC package has a middleware (`errorConversionMiddleware`) that automatically converts `ErrorWithCode` instances from services into `TRPCError` instances.

### In NestJS Controllers Only (`apps/api/`)

```typescript
import { NotFoundException, ForbiddenException } from "@nestjs/common";

throw new NotFoundException(`Post ${postId} not found`);
throw new ForbiddenException("Insufficient permissions");
```

NestJS has an exception filter that can convert `ErrorWithCode` from services into appropriate `HttpException` subclasses.

## packages/features Import Restrictions

Files in `packages/features/**` should NOT import from `@ecom/trpc` or `@nestjs/*`. This keeps the features package decoupled from both API layers, making the code reusable and testable. Use `ErrorWithCode` for error handling in these files.
