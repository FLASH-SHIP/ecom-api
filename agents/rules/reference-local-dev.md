---
title: Local Development Setup
impact: LOW
tags: reference, local, development, setup
---

## Local Development Setup

### Prerequisites
- Node.js 20+
- Yarn 4 (Corepack)
- Docker & Docker Compose
- PostgreSQL client (optional, for `psql`)

### Initial Setup

```bash
# 1. Clone and install
git clone <repo-url> ecom
cd ecom
corepack enable
yarn install

# 2. Start infrastructure
docker compose up -d   # PostgreSQL + Redis

# 3. Configure environment
cp .env.example .env
# Edit .env with your local settings

# 4. Setup database
yarn prisma migrate dev
yarn db:seed

# 5. Start development
yarn dev
```

### Services

| Service | URL | Description |
|---------|-----|-------------|
| Admin Web | http://localhost:4001 | Next.js Admin CMS |
| API v2 | http://localhost:4000 | NestJS REST API |
| API Docs | http://localhost:4000/api | Swagger UI |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache / Sessions |
| Prisma Studio | http://localhost:5555 | `yarn prisma studio` |

### Default Dev Credentials

After seeding (`yarn db:seed`):
- `admin@ecom.com` / `password123` (Super Admin — role: `admin`, all 58 permissions)

### Common Issues

- **Database connection refused**: Run `yarn docker:up`
- **Missing types after schema change**: Run `yarn prisma generate`
- **Port already in use**: Check for existing processes: `lsof -i :3000`
- **Type errors after pull**: Run `yarn install && yarn prisma generate`
