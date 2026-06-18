---
title: Code Review Focus
impact: MEDIUM
tags: quality, review
---

## Code Review Focus Areas

Priority order for code review:
1. **Security** — sensitive data exposure, auth bypass
2. **Correctness** — business logic, edge cases
3. **Architecture** — proper layer separation, DI usage
4. **Performance** — N+1 queries, O(n²) algorithms
5. **Style** — naming, formatting (mostly handled by Biome)
