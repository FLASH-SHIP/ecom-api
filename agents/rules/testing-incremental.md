---
title: Incremental Test Fixing
impact: MEDIUM
tags: testing, incremental
---

## Fix Tests Incrementally

When fixing test failures:
1. Fix type errors first (they often cause cascading failures)
2. Run the specific failing test file, not the entire suite
3. Fix one test at a time
4. Don't skip or disable tests without a clear reason
