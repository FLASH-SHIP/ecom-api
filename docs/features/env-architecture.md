# Technical Documentation: Environment Variable Management & Optimization Architecture

This document explains the unified, secure, and optimized environment variable architecture implemented in the Ecom monorepo, detailing how environment configurations are validated at startup/build time, secured against client-side exposure, and structured to optimize Turborepo caching.

---

## 1. Architectural Overview

To prevent runtime config errors, secure sensitive backend credentials (secrets), and eliminate unnecessary Turborepo build cache invalidation, the repository utilizes a **modular, schema-validated environment variable system**.

The architecture consists of four pillars:
1. **Fine-grained Turborepo Caching**: Evading global `.env` dependency and using task-specific env tracking to maximize cache hits.
2. **Fail-Fast Startup Validation**: App-level Zod schemas parsing and validating configuration at boot time, throwing clear errors immediately if variables are missing or misconfigured.
3. **Client/Server Secret Segregation (Next.js)**: A proxied environment module guarding server-side variables (like `AUTH_SECRET` or `DATABASE_URL`) from being compiled or accessed in the client's browser context.
4. **DRY Local Environment Setup**: A centralized root `.env` file symlinked to individual Next.js workspaces to keep configurations in a single place during local development.

---

## 2. Directory Structure & Key Files

The configuration files and validation schemas are structured as follows:

```bash
ecom/
  ├── .env.example                     # Centralized, documented template for all applications
  ├── .env                             # Centralized local development variables (git ignored)
  ├── turbo.json                       # Turborepo task-level cache configuration
  ├── apps/
  │    ├── admin/
  │    │    ├── .env ──> ../../.env    # Symlink to root .env
  │    │    └── src/
  │    │         ├── env.ts            # Admin App Zod schema & client/server guard proxy
  │    │         └── instrumentation.ts # Bootstrap file validating variables on Next.js startup
  │    ├── customer/
  │    │    ├── .env ──> ../../.env    # Symlink to root .env
  │    │    └── src/
  │    │         ├── env.ts            # Customer App Zod schema & client/server guard proxy
  │    │         └── instrumentation.ts # Bootstrap file validating variables on Next.js startup
  │    └── api/
  │         └── src/
  │              ├── env.ts            # NestJS API Zod schema & validation function
  │              └── app.module.ts     # Configures NestJS ConfigModule with validation
```

---

## 3. Turborepo Caching Optimization

Historically, changing any environment variable invalidated the build caches of all packages because the root `.env` was marked as a global dependency:

```json
// Old configuration (turbo.json)
"globalDependencies": [".env"]
```

To optimize build performance, the `.env` was removed from `globalDependencies` and specific build-time variables were mapped to the `env` field under tasks in [turbo.json](../../turbo.json):

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "env": [
        "NODE_ENV",
        "NEXT_PUBLIC_API_URL",
        "NEXT_PUBLIC_APP_URL",
        "CUSTOMER_APP_URL"
      ]
    }
  }
}
```

*Note: Changes to backend runtime variables (like `DATABASE_URL` or `JWT_SECRET`) will no longer invalidate frontend Next.js build caches, significantly speeding up CI/CD workflows.*

---

## 4. Next.js Client/Server Segregation & Proxy

To enforce strict security and prevent leaking API credentials, database strings, or auth secrets to client-side bundles, we implement a custom Proxy wrapper in [apps/admin/src/env.ts](../../apps/admin/src/env.ts) and [apps/customer/src/env.ts](../../apps/customer/src/env.ts).

### Env Schema Declaration

```typescript
import { z } from "zod";

// 1. Server-side validation schema (strictly hidden from the browser)
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(8),
});

// 2. Client-side validation schema (allowed to be exposed to the browser)
const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

type Env = z.infer<typeof serverSchema> & z.infer<typeof clientSchema>;
```

### The Security Proxy Guard

Instead of exporting the raw `process.env` values directly, a Proxy interceptor is exported:

```typescript
export const env = new Proxy({} as Env, {
  get(_target, prop) {
    const key = prop.toString();
    const isClient = typeof window !== "undefined";

    // Stop execution and throw error if client code tries to access server secrets
    if (isClient && !key.startsWith("NEXT_PUBLIC_")) {
      throw new Error(
        `❌ Security Error: Attempted to access server-side environment variable "${key}" on the client!`
      );
    }

    if (key.startsWith("NEXT_PUBLIC_")) {
      return publicEnv[key as keyof typeof publicEnv];
    }

    return validatedServerEnv?.[key as keyof typeof validatedServerEnv];
  },
});
```

---

## 5. NestJS API Validation (`ConfigModule`)

The NestJS backend application (`@ecom/api`) leverages NestJS's native `@nestjs/config` validation mechanism. 

### Schema Definition & Validation Function

In [apps/api/src/env.ts](../../apps/api/src/env.ts):

```typescript
import { z } from "zod";

export const apiEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  JWT_SECRET: z.string().min(8),
  // Additional SMTP, Storage, and CORS variables...
});

export function validate(config: Record<string, unknown>) {
  const result = apiEnvSchema.safeParse(config);
  if (!result.success) {
    console.error("❌ Invalid API environment variables:");
    console.error(result.error.format());
    throw new Error("Configuration validation failed");
  }
  return result.data;
}
```

### Loading in AppModule

The validator is loaded globally inside [apps/api/src/app.module.ts](../../apps/api/src/app.module.ts):

```typescript
import { validate } from "./env";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../../../.env",
      validate,
    }),
    // ...
  ]
})
```

---

## 6. How to Add a New Environment Variable

When adding a new environment variable to the system, follow these steps to maintain configuration health:

1. **Document in Template**: Add the new key with dummy values or comments in the root [.env.example](../../.env.example).
2. **Assign Value Local**: Add the actual variable value inside your git-ignored root `.env` file.
3. **Declare in Schema**:
   - If the variable is used in **NestJS**: Add the field to the Zod schema in [apps/api/src/env.ts](../../apps/api/src/env.ts).
   - If the variable is used in **Next.js (Admin/Customer)**: Add it to either `serverSchema` or `clientSchema` in `src/env.ts` of the respective app directory.
   - If it is a client-side public variable, it **MUST** start with the `NEXT_PUBLIC_` prefix and be added to the `clientSchema`.
4. **Declare in Turborepo (If Build-time dependent)**:
   - If the variable is baked into Next.js client bundles at compile time (like `NEXT_PUBLIC_...`), add the key to the `"env"` list of the `"build"` task in [turbo.json](../../turbo.json).
