---
title: Standalone NestJS CLI Seeding
impact: MEDIUM
impactDescription: Standardizes DB seeding inside the NestJS IoC container, allowing environment validation and dependency injection
tags: patterns, seed, database, prisma, nestjs, cli
---

## Standardize Database Seeding via NestJS CLI Context

**Impact: MEDIUM**

Rather than executing database seeders through raw node scripts that connect to database adapters directly, seeders should run under a standalone NestJS application context. This provides consistency in:
- **Environment Validation**: Ensures all `.env` files are checked against schemas.
- **Dependency Injection (DI)**: Enables seeders to resolve core application services (e.g. `UsersService` to hash passwords using system settings) and repositories.
- **Unified Lifecycle & Config**: Integrates with standard configurations, database pools, and log systems.

---

## Pattern Implementation

We structure CLI seeding via:
1. An entrypoint script `apps/api/src/seed.ts` that boots a headless NestJS container using `NestFactory.createApplicationContext()`.
2. A `SeedService` registered in the application module that loops through registered seeders.
3. Node scripts in the monorepo configuration pointing to this entrypoint.

### Incorrect (Raw Node.js DB Connection Seeding):

```typescript
// Bad: Manual connection creation without config schema checks and unable to use DI
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({ data: { email: "admin@ecom.com", passwordHash: "raw_or_manually_hashed" } });
}
main();
```

### Correct (NestJS Application Context Seeding):

**1. Create the Seed Entrypoint:**
```typescript
// apps/api/src/seed.ts
import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SeedService } from "./common/seed/seed.service";

async function bootstrap() {
  // Boots headless context without listening to an HTTP port
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seedService = app.get(SeedService);
    await seedService.run();
    await app.close();
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    await app.close();
    process.exit(1);
  }
}
bootstrap();
```

**2. Declare `SeedService`:**
```typescript
// apps/api/src/common/seed/seed.service.ts
import { Injectable } from "@nestjs/common";
import { prisma } from "@ecom/prisma";
import { SEEDERS } from "@ecom/prisma/seeders/index";

@Injectable()
export class SeedService {
  async run() {
    const only = process.env.SEED_ONLY;
    const seeders = only
      ? SEEDERS.filter((s) => s.name.toLowerCase().includes(only.toLowerCase()))
      : SEEDERS;

    for (const seeder of seeders) {
      await seeder.run(prisma);
    }
  }
}
```

---

## CLI Commands Reference

- Run all seeds:
  ```bash
  yarn prisma:seed:nestjs
  ```
- Run a specific seeder:
  ```bash
  SEED_ONLY=AdminUser yarn prisma:seed:nestjs
  ```

---

## Common Mistakes to Avoid

*   **Mistake 1: Bootstrapping a full server**
    Do not use `NestFactory.create(AppModule)` for seeds. It will start listening on the web port, which causes conflicts and blocks execution. Always use `NestFactory.createApplicationContext(AppModule)`.
*   **Mistake 2: Missing Graceful Exit**
    Ensure `await app.close()` and `process.exit(0)` are called upon successful completion so that the database pool connections are clean and the command-line execution returns prompt control.
