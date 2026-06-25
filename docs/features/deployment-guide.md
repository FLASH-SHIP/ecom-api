# Technical Documentation: System Deployment & Infrastructure Guide

This guide provides detailed instructions for the Infrastructure team to deploy the Ecom system to staging and production environments. It covers prerequisites, database migrations, Docker builds for the Next.js frontends, backend NestJS deployment, and reverse proxy setup.

---

## 1. System Architecture Overview

The Ecom system is built as a Yarn workspaces monorepo containing:
1. **NestJS API Backend (`@ecom/api`)**: Runs on Node.js, exposing REST endpoints for mobile/extension apps and public endpoints.
2. **Next.js Admin Portal (`@ecom/admin`)**: Next.js App Router app using NextAuth for administrative CMS.
3. **Next.js Customer Portal (`@ecom/customer`)**: Public customer-facing Next.js App Router app.
4. **Shared Database & Cache**: PostgreSQL (relational DB) and Redis (caching, rate limiting, and queues).

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
If deploying directly to a Virtual Private Server (VPS) without Docker, you can build and run all applications (NestJS API, Next.js Admin, and Next.js Customer) using Yarn and PM2:

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

   # Build Next.js Admin CMS
   yarn workspace @ecom/admin build

   # Build Next.js Customer App
   yarn workspace @ecom/customer build
   ```
3. **Run with PM2**:
   Create a centralized `pm2.config.js` in the root of the project to orchestrate all three applications:
   ```javascript
   module.exports = {
     apps: [
       // 1. NestJS Backend API
       {
         name: "ecom-api",
         script: "apps/api/dist/main.js",
         instances: "max",
         exec_mode: "cluster",
         env: {
           NODE_ENV: "production",
         },
       },
       // 2. Next.js Admin CMS
       {
         name: "ecom-admin",
         script: "node_modules/.bin/next",
         args: "start apps/admin --port 4001",
         instances: "max",
         exec_mode: "cluster",
         env: {
           NODE_ENV: "production",
         },
       },
       // 3. Next.js Customer App
       {
         name: "ecom-customer",
         script: "node_modules/.bin/next",
         args: "start apps/customer --port 3001",
         instances: "max",
         exec_mode: "cluster",
         env: {
           NODE_ENV: "production",
         },
       },
     ],
   };
   ```
   Start all applications simultaneously:
   ```bash
   pm2 start pm2.config.js
   ```

   > [!TIP]
   > For low-memory VPS environments, instead of `next start`, you can run the optimized Next.js standalone server directly:
   > * **Admin**: `script: "apps/admin/.next/standalone/apps/admin/server.js"` with env `PORT: 4001`
   > * **Customer**: `script: "apps/customer/.next/standalone/apps/customer/server.js"` with env `PORT: 3001`

### Approach B: Dockerizing the NestJS API
To package the NestJS API into a Docker container, use the following production-optimized multi-stage Dockerfile (save as `Dockerfile.api` in the root):

```dockerfile
# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY packages/prisma/package.json packages/prisma/
COPY packages/lib/package.json packages/lib/
COPY packages/features/package.json packages/features/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/
COPY packages/tsconfig/package.json packages/tsconfig/
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
CMD ["node", "apps/api/dist/main.js"]
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
The root [Dockerfile](../../Dockerfile) compiles Next.js projects based on the `APP` build argument:

#### 1. Admin Portal (`@ecom/admin`)
```bash
# Build the Admin Image
docker build -t ecom-admin --build-arg APP=admin .

# Run the Admin Container
docker run -d -p 3000:3000 --env-file .env ecom-admin
```

#### 2. Customer Portal (`@ecom/customer`)
Next.js outputs standalone bundles in a nested structure. Note that the command inside the runner stage of the [Dockerfile](../../Dockerfile) uses `node apps/admin/server.js` by default. You should override the startup command in Docker or adjust the Dockerfile when running the Customer container.

```bash
# Build the Customer Image
docker build -t ecom-customer --build-arg APP=customer .

# Run the Customer Container (Overriding CMD to customer startup script)
docker run -d -p 3001:3000 --env-file .env ecom-customer node apps/customer/server.js
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

upstream admin_portal {
    server 127.0.0.1:3000;
    keepalive 32;
}

upstream customer_portal {
    server 127.0.0.1:3001;
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

# 2. Admin CMS Reverse Proxy
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

# 3. Customer Portal Reverse Proxy
server {
    listen 80;
    server_name www.ecom.com ecom.com;

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
```

---

## 7. Production Environment Configuration Checklist

Ensure all values in the production environment variables (injected at container start or runtime) conform to the following:

- [ ] `DATABASE_URL`: Point to production Postgres instance.
- [ ] `REDIS_URL`: Point to production Redis instance.
- [ ] `AUTH_SECRET` & `NEXTAUTH_SECRET`: Random 32-character keys (`openssl rand -base64 32`).
- [ ] `JWT_SECRET`: Random 32-character key.
- [ ] `NEXT_PUBLIC_API_URL` & `NEXT_PUBLIC_APP_URL` & `CUSTOMER_APP_URL`: Set to production HTTPS domains.
- [ ] `SMTP_USER` & `SMTP_PASS` & `SMTP_HOST`: Valid SMTP credentials (Mailgun, SendGrid, etc.).
- [ ] `STORAGE_DISK`: Set to `s3` and configure `STORAGE_S3_*` values if using object storage.
