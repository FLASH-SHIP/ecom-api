# Technical Documentation: System Deployment & Infrastructure Guide

This guide provides detailed instructions for the Infrastructure team to deploy the Ecom system to staging and production environments. It covers prerequisites, database migrations, Docker builds for the Next.js frontends, backend NestJS deployment, and reverse proxy setup.

---

## 1. System Architecture Overview

The Ecom system is built as a Yarn workspaces monorepo containing:

1. **NestJS API Backend (`@ecom/api`)**: Runs on Node.js, exposing REST/tRPC backend APIs.
2. **Next.js Public Portal (`@ecom/web`)**: Customer-facing public website, blog, and static pages.
3. **Next.js Customer Portal (`@ecom/customer`)**: Customer dashboard, profile, and user account management.
4. **Next.js Admin Portal (`@ecom/admin`)**: Administrative dashboard and CMS portal.
5. **Shared Database & Cache**: PostgreSQL (relational DB) and Redis (caching, rate limiting, and queues).

---

## 2. Infrastructure Requirements

### Backend Services

- **Node.js**: `v20.x` or higher (Active LTS recommended).
- **Yarn**: `v4.x` (managed via Corepack in the repo).

### Databases & Cache

- **PostgreSQL**: `v18.x` or higher (Active LTS).
- **Redis**: `v7.x` or higher.

---

## 3. Database Setup & Migrations

The project utilizes Prisma ORM to manage schema migrations.

### Step 1: Database Provisioning & Timezone Setup

1. **Database Creation**: Ensure a PostgreSQL database is created and the user has permissions to create tables and execute DDL operations.
2. **Timezone Configuration (Critical)**: The database **must** be configured to use the **UTC** timezone to avoid runtime logic issues (such as session eviction bugs caused by local timezone shifts).
   - **AWS RDS/Cloud SQL**: Ensure the database instance timezone parameter is set to `UTC` (this is the default on AWS RDS).
   - **Bare-Metal/Self-Hosted**: Set `timezone = 'UTC'` in your `postgresql.conf` or alter the target database timezone explicitly:

     ```sql
     ALTER DATABASE name_of_db SET timezone TO 'UTC';
     ```

     *(Note: Reconnect to verify the changes with `SHOW timezone;`)*
   - **Docker Containers**: Include environment variables `TZ=UTC` and `PGTZ=UTC` on the PostgreSQL service.

### Step 2: Apply Migrations (CI/CD Pipeline)

During deployment, run the following command to apply schema migrations to the database. This command should run **before** starting the backend API or frontends.

```bash
# Run from the root of the project
yarn prisma generate
npx prisma migrate deploy
```

> [!WARNING]
> Do not use `prisma migrate dev` on staging or production as it can cause database resets. Always use `prisma migrate deploy`.

### Step 3: Seed Database (Initial Setup)

For new installations, seed the database with initial roles, permissions, and settings:

```bash
yarn prisma:seed
```

---

## 4. Deploying the NestJS API Backend (`@ecom/api`)

The backend is located in [apps/api](../../apps/api). It compiles TypeScript into raw JavaScript.

### Approach A: Bare-Metal / PM2 (Recommended for VPS)

If deploying directly to a Virtual Private Server (VPS) without Docker, you can build and run all applications (NestJS API, Next.js Public Web, Next.js Customer, and Next.js Admin) using Yarn and PM2:

1. **Install Dependencies**:

   ```bash
   yarn install --immutable
   ```

2. **Build all Applications**:

   Generate the Prisma client and build all the workspaces:

   ```bash
   # Generate Prisma client
   yarn prisma generate

   # Build NestJS API
   yarn workspace @ecom/api build

   # Build Next.js Public Portal
   yarn workspace @ecom/web build

   # Build Next.js Customer App
   yarn workspace @ecom/customer build

   # Build Next.js Admin CMS
   yarn workspace @ecom/admin build
   ```

    > [!IMPORTANT]
    > **Build-time Environment Variables for Next.js**:
    > Next.js bakes public client variables (prefixed with `NEXT_PUBLIC_`) into the JavaScript bundle *during build time*. Before running the build commands above, you **must** load the environment variables.
    >
    > You can refer to the root [./.env.example](../../.env.example) as a master list, or consult the detailed, app-specific templates:
    > - API App: [apps/api/.env.example](../../apps/api/.env.example)
    > - Admin CMS: [apps/admin/.env.example](../../apps/admin/.env.example)
    > - Customer App: [apps/customer/.env.example](../../apps/customer/.env.example)
    > - Web/Marketing: [apps/web/.env.example](../../apps/web/.env.example)
    > - Prisma migrations: [packages/prisma/.env.example](../../packages/prisma/.env.example)
    >
    > For local/standalone builds, you can load variables into your shell session:
    > ```bash
    > export $(grep -v '^#' .env | xargs)
    > ```
    > Or copy/link the root `.env` into each application's directory (e.g., `cp .env apps/web/.env` or use symbolic links).

3. **Run with PM2**:

   Create a centralized `pm2.config.js` in the root of the project to orchestrate all four applications. It is highly recommended to run the Next.js standalone server outputs directly (which reduces memory overhead significantly compared to executing `next start`):

   ```javascript
   module.exports = {
     apps: [
       // 1. NestJS Backend API (Port 4000)
       {
         name: "ecom-api",
         script: "apps/api/dist/src/main.js",
         node_args: "--import tsx --env-file=.env",
         instances: "max",
         exec_mode: "cluster",
         env: {
           NODE_ENV: "production",
         },
       },
       // 2. Next.js Public Portal (Port 3000)
       {
         name: "ecom-web",
         script: "apps/web/.next/standalone/apps/web/server.js",
         node_args: "--env-file=.env",
         instances: "max",
         exec_mode: "cluster",
         env: {
           NODE_ENV: "production",
           PORT: 3000,
         },
       },
       // 3. Next.js Customer App (Port 3001)
       {
         name: "ecom-customer",
         script: "apps/customer/.next/standalone/apps/customer/server.js",
         node_args: "--env-file=.env",
         instances: "max",
         exec_mode: "cluster",
         env: {
           NODE_ENV: "production",
           PORT: 3001,
         },
       },
       // 4. Next.js Admin CMS (Port 4001)
       {
         name: "ecom-admin",
         script: "apps/admin/.next/standalone/apps/admin/server.js",
         node_args: "--env-file=.env",
         instances: "max",
         exec_mode: "cluster",
         env: {
           NODE_ENV: "production",
           PORT: 4001,
         },
       },
     ],
   };
   ```

   Start all applications simultaneously:

   ```bash
   pm2 start pm2.config.js
   ```

### Approach B: Dockerizing the NestJS API

To package the NestJS API into a Docker container, use the following production-optimized multi-stage Dockerfile (save as `Dockerfile.api` in the root):

```dockerfile
# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Copy workspace package.json files to build resolution tree
COPY packages/prisma/package.json packages/prisma/
COPY packages/lib/package.json packages/lib/
COPY packages/trpc/package.json packages/trpc/
COPY packages/features/package.json packages/features/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
COPY packages/i18n/package.json packages/i18n/
COPY packages/config/package.json packages/config/
COPY packages/emails/package.json packages/emails/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/shared/package.json packages/shared/
COPY apps/admin/package.json apps/admin/
COPY apps/customer/package.json apps/customer/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/

RUN yarn install --immutable

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarn ./.yarn
COPY . .
RUN yarn prisma generate
RUN yarn workspace @ecom/api build

# --- Stage 3: Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

USER nestjs
EXPOSE 4000
ENV PORT=4000
CMD ["node", "--import", "tsx", "apps/api/dist/src/main.js"]
```

Build and run:

```bash
docker build -f Dockerfile.api -t ecom-api .
docker run -d -p 4000:4000 --env-file .env ecom-api
```

---

## 5. Deploying Next.js Frontend Apps

The frontends are built using Next.js **standalone** mode (which bundles dependencies into a minimal runner setup to reduce Docker image sizes to < 100MB).

### Build & Package using Docker

The root [Dockerfile](../../Dockerfile) compiles Next.js projects based on the `APP` build argument. Because the Dockerfile is configured to use dynamic entrypoint scripts via `ENV APP_NAME`, you do **not** need to manually override the container start command (`CMD`) when running different application targets.

#### 1. Public Portal (`@ecom/web`)

```bash
# Build the Public Web Image
docker build -t ecom-web --build-arg APP=web .

# Run the Public Web Container (maps host 3000 -> container 3000)
docker run -d -p 3000:3000 --env-file .env ecom-web
```

#### 2. Customer Portal (`@ecom/customer`)

```bash
# Build the Customer Image
docker build -t ecom-customer --build-arg APP=customer .

# Run the Customer Container (maps host 3001 -> container 3000)
docker run -d -p 3001:3000 --env-file .env ecom-customer
```

#### 3. Admin Portal (`@ecom/admin`)

```bash
# Build the Admin Image
docker build -t ecom-admin --build-arg APP=admin .

# Run the Admin Container (maps host 4001 -> container 3000)
docker run -d -p 4001:3000 --env-file .env ecom-admin
```

---

## 6. Reverse Proxy Configuration (Nginx)

Below is a standard production Nginx server configuration template to route requests to the Docker containers or PM2 ports.

```nginx
# Upstream Definitions
upstream backend_api {
    server 127.0.0.1:4000;
    keepalive 32;
}

upstream public_portal {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream customer_portal {
    server 127.0.0.1:3001;
    keepalive 32;
}

upstream admin_portal {
    server 127.0.0.1:4001;
    keepalive 32;
}

# 1. API Reverse Proxy
server {
    listen 80;
    server_name api.ecom.com;

    location / {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 2. Public Portal Reverse Proxy
server {
    listen 80;
    server_name www.ecom.com ecom.com;

    location / {
        proxy_pass http://public_portal;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 3. Customer Portal Reverse Proxy
server {
    listen 80;
    server_name customer.ecom.com;

    location / {
        proxy_pass http://customer_portal;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 4. Admin CMS Reverse Proxy
server {
    listen 80;
    server_name admin.ecom.com;

    location / {
        proxy_pass http://admin_portal;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 7. Production Environment Configuration Checklist

The application validates environment variables at startup using **Zod**. If any required environment variable is missing or malformed, the container or PM2 process will output a validation error and **fail to start**.

Ensure all values in the production environment variables (injected at container start or runtime) are configured as follows:

### 1. Database & Cache Infrastructure (All Services)

- [ ] `DATABASE_URL`: Production PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db?sslmode=require`).
- [ ] `DATABASE_REPLICA_URLS` (Optional): Comma-separated list of database read-replica URLs (used for database read scaling).
- [ ] `REDIS_URL`: Production Redis URL for queue management and cache (e.g., `redis://host:6379`).

### 2. NestJS API Backend (`@ecom/api`)

- [ ] `JWT_SECRET`: Cryptographically strong random key for customer sessions (minimum 8 characters, 32+ recommended).
- [ ] `JWT_ADMIN_SECRET`: Cryptographically strong random key for admin sessions (minimum 8 characters, must match `@ecom/admin`'s `JWT_ADMIN_SECRET`).
- [ ] `WEB_URL`: The production URL of the Admin CMS (used for CORS mapping, e.g., `https://admin.ecom.com`).
- [ ] `CUSTOMER_APP_URL`: The production URL of the Customer Portal (used for CORS mapping, e.g., `https://customer.ecom.com`).

### 3. Next.js Frontends (Public Web, Customer, Admin)

#### Shared Authentication Secrets

- [ ] `AUTH_SECRET` & `NEXTAUTH_SECRET`: Set to the same cryptographically secure 32-character key (`openssl rand -base64 32`) on Admin and Customer portals.
- [ ] `AUTH_TRUST_HOST`: Must be set to `true` when deploying to a custom server/VPS behind a reverse proxy (e.g. Nginx, Cloudflare) to trust forwarded request headers.
- [ ] `JWT_SECRET` (Customer Portal only): Must match the API's `JWT_SECRET`.
- [ ] `JWT_ADMIN_SECRET` (Admin Portal only): Must match the API's `JWT_ADMIN_SECRET`.

#### Client-side Variables (Exposed via `NEXT_PUBLIC_*`)

- [ ] `NEXT_PUBLIC_API_URL`: Set to production API URL (e.g., `https://api.ecom.com`).
- [ ] `NEXT_PUBLIC_APP_URL`: Set to the app's own domain name.
- [ ] `NEXT_PUBLIC_WEB_URL`: Set to the production Public Web URL (e.g., `https://ecom.com`).
- [ ] `NEXT_PUBLIC_CUSTOMER_URL`: Set to the production Customer Portal URL (e.g., `https://customer.ecom.com`).

### 4. Third-Party Services

- [ ] **Email (SMTP)**: Provide `SMTP_HOST`, `SMTP_PORT` (e.g., `587` or `465`), `SMTP_USER`, `SMTP_PASS`, and a valid `MAIL_FROM` address.
- [ ] **Storage (S3)**: If `STORAGE_DISK` is set to `s3`, ensure `STORAGE_S3_BUCKET`, `STORAGE_S3_REGION`, `STORAGE_S3_ACCESS_KEY`, and `STORAGE_S3_SECRET_KEY` are provided.
