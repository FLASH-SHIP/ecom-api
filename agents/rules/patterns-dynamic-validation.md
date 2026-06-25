---
title: Dynamic Validation Groups
impact: HIGH
impactDescription: Allows contextual validation rules for shared DTOs based on request properties, method, or payload attributes
tags: patterns, validation, class-validator, nestjs
---

## Use Dynamic Validation Groups for Context-Aware Rules

**Impact: HIGH**

When using NestJS `ValidationPipe`, validation constraints are static by default. To validate a DTO differently based on context (e.g., matching a dynamic request payload like `formSlug`, HTTP method, or metadata from route guards), use the dynamic validation groups pattern.

This is achieved using:
1. A `@ValidationGroups()` metadata decorator.
2. A `ValidationGroupsGuard` that runs before validation pipes to register controller/handler metadata groups onto the request.
3. A request-scoped `DynamicValidationPipe` that resolves the active group (explicit metadata, payload `formSlug`, or HTTP method fallback) and passes it to `class-validator`.

### Incorrect (Duplicating DTOs or hardcoding multiple validation passes):

```typescript
// Bad: Writing duplicate validation logic inside controllers
@Post('vip')
async createVip(@Body() body: any) {
  if (!body.phone) {
    throw new BadRequestException("Phone is required for VIP submissions");
  }
}
```

### Correct (Dynamic Validation Groups):

Annotate the DTO fields with `groups` constraints. For rules that must always run regardless of the active group, specify `{ always: true }`.

**1. Define DTO Constraints:**
```typescript
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateSubmissionDto {
  @IsString({ always: true })
  @IsNotEmpty({ always: true })
  name!: string;

  @IsEmail({}, { always: true })
  email!: string;

  // phone is only required when validation group is "vip", otherwise optional
  @IsString({ always: true })
  @IsNotEmpty({ groups: ["vip"], message: "Phone is required for VIP submissions" })
  @IsOptional({ groups: ["default", "create"] })
  phone?: string;
}
```

**2. Attach Groups to Routes (using guard or payload fallback):**
```typescript
@Post('vip')
@UseGuards(ValidationGroupsGuard)
@ValidationGroups('vip')
async createVip(@Body() body: CreateSubmissionDto) {
  return this.contactsService.create(body);
}
```

---

## How It Resolves Groups Internally

The request-scoped global `DynamicValidationPipe` resolves groups in this order of precedence:
1. **Explicit Guard Metadata**: Groups specified via `@ValidationGroups()` on the controller class or route handler.
2. **Payload-based Dynamic Value**: If the payload object contains `formSlug`, that string value is used as the active validation group (e.g., `formSlug: "vip"` evaluates the `"vip"` rules).
3. **HTTP Method Fallback**: If no group is set, `POST` requests default to `"create"`, and `PUT`/`PATCH` requests default to `"update"`.

---

## Common Mistakes to Avoid

*   **Mistake 1: Forgetting `{ always: true }` on common fields**
    If any validation group is active, fields *without* groups will not be validated. Ensure that general validations (e.g., email syntax, name presence) are annotated with `{ always: true }`.
*   **Mistake 2: Type-only imports of Reflector in guards**
    NestJS relies on constructor metadata reflection to inject the `Reflector` class. Always use value imports (e.g., `import { Reflector } from "@nestjs/core"`) and bypass linter errors using a `biome-ignore` comment instead of converting it to a type-only import.
