---
title: Prisma Schema Changes and Migrations
impact: CRITICAL
tags: data, prisma, migrations, schema
---

## Prisma Schema Changes and Migrations

1. **MANDATORY**: Any modification to `packages/prisma/schema/*.prisma` MUST be accompanied by a generated migration SQL file in `packages/prisma/schema/migrations/`.
2. **NO `db push`**: Never use `prisma db push` as a substitute for generating migration files when developing features.
3. Always run `yarn prisma migrate dev --name descriptive_name` (or `yarn prisma:migrate`) to create migration SQL files.
4. Migration names must be descriptive: `add_carrier_code_and_label_url_to_orders`, `add_post_status_field`.
5. For non-destructive column renames, use `yarn workspace @ecom/prisma prisma migrate dev --create-only` and edit the SQL file to use `ALTER TABLE ... RENAME COLUMN ...`.
6. Never manually edit applied migration SQL files.
7. Always verify zero schema drift with `yarn db:check-drift`.
8. Always run `yarn prisma generate` after schema changes to regenerate TypeScript types.

