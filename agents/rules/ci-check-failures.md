---
title: Handling CI Failures
impact: MEDIUM
tags: ci, failures, debugging
---

## Handling CI Failures

1. Always run `yarn type-check:ci --force` locally first
2. Check if the failure is related to your changes
3. Fix type errors before test failures
4. Run `yarn prisma generate` if you see missing type errors
5. Don't assume CI failures are "flaky" — investigate first
