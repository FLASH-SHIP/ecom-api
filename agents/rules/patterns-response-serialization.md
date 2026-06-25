---
title: Response Payload Serialization
impact: HIGH
impactDescription: Enforces defense-in-depth data protection by automatically stripping fields annotated with @Exclude()
tags: patterns, serialization, interceptor, class-serializer, security, dto
---

## Use ClassSerializerInterceptor for Defense-in-Depth Payload Protection

**Impact: HIGH**

To prevent leaking internal schema details or sensitive properties (like passwords, keys, or token hashes) in HTTP response bodies, do not rely solely on manual field deletion or mapping. Instead, use NestJS `ClassSerializerInterceptor` globally.

When `ClassSerializerInterceptor` is active:
1. Any controller return value passed through the interceptor is serialized using `class-transformer`.
2. Fields decorated with `@Exclude()` inside the target DTO class are automatically stripped.
3. Fields decorated with `@Expose()` can be dynamically computed or mapped.

---

## Pattern Configuration

The interceptor is registered globally in `main.ts` alongside the Reflector:

```typescript
import { ClassSerializerInterceptor } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
}
```

### Example DTO Definition:

```typescript
import { Exclude, Expose } from "class-transformer";

export class UserDto {
  id!: number;
  email!: string;

  // Automatically stripped from all JSON response payloads
  @Exclude()
  passwordHash!: string;

  @Exclude()
  refreshTokenHash!: string;

  @Expose()
  get displayName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
```

---

## Common Mistakes to Avoid

*   **Mistake 1: Returning plain objects without class instantiation**
    `ClassSerializerInterceptor` relies on the returned object being an instance of a class (e.g. `UserDto`) so that it can inspect the metadata decorators. If you return a plain database object directly, the interceptor will not strip properties. Always map database outputs to DTO classes using `plainToInstance()` or through custom Transformers.
*   **Mistake 2: Missing runtime decorator references**
    NestJS requires runtime class references to evaluate decorator metadata. Do not import DTOs or Entities using `import type` if they are passed to controllers, and ensure class-transformer metadata is preserved during build compilation.
