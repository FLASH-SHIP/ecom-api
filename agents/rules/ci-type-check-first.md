---
title: Type-Check Before Tests
impact: MEDIUM
tags: ci, type-check
---

## Type-Check Before Running Tests

Always run `yarn type-check:ci --force` before `yarn test`. Type errors often cause cascading test failures — fix types first.
