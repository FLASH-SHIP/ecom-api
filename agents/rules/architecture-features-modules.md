---
title: packages/features vs apps/web/modules
impact: HIGH
tags: architecture, features, modules, separation
---

## packages/features vs apps/web Modules

**Impact: HIGH**

| Location | Purpose | Can Import |
|----------|---------|-----------|
| `packages/features/` | Business logic (services, repos, DI, types) | `packages/lib`, `packages/prisma`, `packages/types` |
| `apps/web/modules/` | Page-level UI composition | Everything including `packages/features`, `packages/ui` |
| `apps/web/components/` | App-specific UI components | `packages/ui`, `packages/lib` |

### Rules

- Business logic always goes in `packages/features/`
- UI components shared between features go in `packages/ui/`
- Feature-specific UI components go in `packages/features/{name}/components/`
- Page composition logic goes in `apps/web/modules/` or directly in `app/` pages
