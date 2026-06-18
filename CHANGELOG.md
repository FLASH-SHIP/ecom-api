# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-28

### Added

- **Monorepo scaffold**: Yarn 4 + Turborepo v2 + Biome v2
- **Database**: PostgreSQL 18 + Prisma v6 schema (Auth, RBAC, Blog)
- **Auth (Web)**: NextAuth v5 with credentials provider
- **Auth (API)**: Dual-strategy guard (JWT + API Key with `ecom_` prefix)
- **tRPC**: Type-safe API layer with `auth.me` and `auth.updateProfile` procedures
- **REST API v2**: NestJS with Swagger docs, health check, and user profile endpoints
- **Vertical slice architecture**: DI containers, separated procedures, repository pattern
- **Security**: Select-only Prisma queries, security headers, no sensitive field exposure
- **Documentation**: API technical docs + Bruno collection
- **Seeding**: Admin user + RBAC roles/permissions seed data
