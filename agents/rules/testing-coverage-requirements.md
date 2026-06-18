---
title: Test Coverage Requirements
impact: HIGH
tags: testing, vitest, coverage
---

## Test Coverage

- **Services**: Must have unit tests for all public methods
- **Repositories**: Integration tests for complex queries
- **tRPC routers**: Test input validation and error handling
- **NestJS controllers**: E2E tests for auth flows and CRUD operations
- Run tests with: `TZ=UTC yarn test`
- Use `describe()` blocks organized by method name
