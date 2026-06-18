---
title: Code Review Standards
impact: MEDIUM
tags: quality, review
---

## Code Review Standards

When reviewing code, check:
1. **Type safety** — no `as any`, proper type imports
2. **Prisma queries** — uses `select`, no sensitive field leaks
3. **Architecture** — business logic in services, not controllers/routers
4. **Error handling** — descriptive messages, correct error class
5. **DI** — no direct instantiation, uses container getters
6. **Imports** — direct paths, no barrel imports
7. **i18n** — UI strings in translation files (en + vi)
8. **Tests** — relevant tests added or updated
