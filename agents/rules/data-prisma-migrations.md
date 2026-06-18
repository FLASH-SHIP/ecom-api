---
title: Prisma Schema Changes and Migrations
impact: HIGH
tags: data, prisma, migrations, schema
---

## Prisma Schema Changes and Migrations

1. Always run `yarn prisma generate` after schema changes to regenerate types
2. Always run `yarn prisma migrate dev --name descriptive_name` to create migration
3. Migration names should be descriptive: `add_post_status_field`, `create_api_keys_table`
4. Never manually edit migration SQL files after they've been applied
5. Always verify migration with `yarn type-check:ci --force`
6. Test both up and down migrations in development
