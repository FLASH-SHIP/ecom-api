---
title: API Stability - No Breaking Changes
impact: HIGH
tags: api, rest, versioning
---

## No Breaking Changes in APIs

The NestJS REST API (`/api/v2/`) serves mobile apps and Chrome extensions that can't be force-updated. Never:

- Remove existing endpoints without deprecation period
- Change response shapes (add fields, don't remove them)
- Change parameter types or make optional params required
- Change authentication requirements without migration path

For breaking changes, create a new API version (`/api/v3/`) and deprecate the old one.
