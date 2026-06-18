# ============================================
# Ecom — Production Multi-Stage Build
# ============================================
# Optimized for: minimal image size, build cache, security
#
# Build: docker build -t ecom --build-arg APP=admin .
# Run:   docker run -p 3000:3000 --env-file .env ecom

# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
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
COPY apps/admin/package.json apps/admin/
COPY apps/customer/package.json apps/customer/
COPY turbo.json ./

RUN yarn install --immutable

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

ARG APP=admin

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarn ./.yarn
COPY . .

# Generate Prisma client
RUN yarn prisma generate

# Build the specific app
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn turbo build --filter=@ecom/${APP}

# --- Stage 3: Runner ---
FROM node:20-alpine AS runner
RUN corepack enable
WORKDIR /app

ARG APP=admin

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built artifacts
COPY --from=builder /app/apps/${APP}/.next/standalone ./
COPY --from=builder /app/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=builder /app/apps/${APP}/public ./apps/${APP}/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/admin/server.js"]
