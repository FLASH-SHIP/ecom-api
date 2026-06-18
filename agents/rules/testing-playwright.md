---
title: Playwright E2E Tests
impact: MEDIUM
tags: testing, playwright, e2e
---

## Playwright Tests

- Run: `yarn e2e`
- Run specific: `yarn e2e tests/auth.e2e.ts --grep "login"`
- Tests go in `tests/` directory at root
- Use Page Object Model for complex flows
- Always clean up test data after tests
