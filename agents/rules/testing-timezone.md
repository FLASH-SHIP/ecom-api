---
title: Timezone Handling
impact: MEDIUM
tags: testing, timezone
---

## Always run tests with TZ=UTC

```bash
TZ=UTC yarn test
```

This prevents timezone-related test flakes on different developer machines.
