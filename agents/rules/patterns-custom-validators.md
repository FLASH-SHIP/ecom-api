---
title: Custom Database Validators
impact: HIGH
impactDescription: Standardizes DB-backed unique validation checks directly in DTO decorators instead of controller logic
tags: patterns, validation, class-validator, custom-validators, database, prisma
---

## Use Custom Database Validators for DTO Uniqueness Checks

**Impact: HIGH**

Uniqueness validation (e.g., checking if a registration email or username is already taken) should happen during the request parsing and validation phase in DTOs. Do not implement manual database checks inside your services or controllers simply to throw bad request validation errors.

Use the custom `@IsUnique()` database-backed validator decorator.

---

## Pattern Implementation

The pattern is split into:
1. An asynchronous validator constraint class (`IsUniqueConstraint`) implementing `ValidatorConstraintInterface`.
2. A factory registration decorator function (`IsUnique`).
3. Global registry in the NestJS application container.

### Incorrect (Database checks inside Services/Controllers):

```typescript
// Bad: Pollution of core service method with validation/uniqueness checks
async register(dto: RegisterDto) {
  const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
  if (existing) {
    throw new BadRequestException("Email already exists");
  }
}
```

### Correct (Decorator-based Uniqueness Checks):

**1. Apply Decorator to DTO Fields:**
```typescript
import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { IsUnique } from "../../../common/validators/is-unique.validator";

export class RegisterDto {
  @IsEmail()
  // Automatically queries the Prisma 'customer' table's 'email' column
  @IsUnique("customer", "email", { message: "Email is already registered." })
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
```

**2. IoC Container Configuration:**
Because database constraint validators are instantiated by `class-validator` (which sits outside NestJS's standard provider lifecycle), we must enable class-validator to fall back on NestJS container resolution for resolving dependencies.

This is configured in `main.ts`:
```typescript
import { useContainer } from "class-validator";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Instructs class-validator to resolve validator constraints using NestJS container
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
}
```

---

## Common Mistakes to Avoid

*   **Mistake 1: Forgetting `useContainer` in main.ts**
    If `useContainer(app.select(AppModule), ...)` is not configured in `main.ts`, class-validator will not be able to resolve injected providers (like the PrismaClient instance) inside custom validator constraint classes, causing class-validator to fail with resolution errors.
*   **Mistake 2: Missing select clauses inside validation queries**
    When querying for record existence, do not load the entire record payload. Always specify a tight select clause (e.g., `select: { id: true }`) for optimal query performance and memory footprint.
