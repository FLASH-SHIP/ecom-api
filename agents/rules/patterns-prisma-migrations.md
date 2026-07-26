# Prisma Database Lifecycle & Migration Guidelines

## Rule Summary

- **Schema Modification**: Any change to `packages/prisma/schema/*.prisma` MUST be accompanied by a generated migration SQL file via `yarn prisma migrate dev --name <change_name>`.
- **Zero Schema Drift**: Always run `yarn db:check-drift` to verify zero schema drift between `.prisma` models and migration SQL files before committing.
- **Seeding Classification**: Seeders are split into `core` (Permissions, Roles, Settings, Languages, Divisions) and `business` (RateCards, Customers).
- **Environment Safety**: Never use `prisma db push` in development as a substitute for migrations.

## Migration Workflow for Developers & AI Agents

### 1. Modifying Schema Files

When adding or modifying models/columns in `packages/prisma/schema/`:

```bash
# 1. Generate migration SQL and update TypeScript types
yarn prisma migrate dev --name add_new_feature_column

# 2. Verify schema drift (MUST pass with 0 exit code)
yarn db:check-drift
```

### 2. Seeding Strategy

- **Run Core Seeders Only** (System reference data):

  ```bash
  yarn prisma:seed:core
  ```

- **Run Business Seeders Only** (Rate Cards, Sample Customers):

  ```bash
  yarn prisma:seed:business
  ```

- **Run Specific Seeder**:

  ```bash
  SEED_ONLY=Rate yarn prisma:seed
  ```

- **Reset Development Environment**:

  ```bash
  yarn db:reset
  ```

### 3. CI/CD Checks

The CI pipeline automatically enforces schema integrity via `yarn db:check-drift`. Pull requests with un-migrated schema changes will be blocked.
