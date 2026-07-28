import "./load-env";
import "./bootstrap-env";
import "reflect-metadata";
import { join } from "node:path";
import { resolveUserPermissions } from "@ecom/features/auth/utils/permissionUtils";
import { registerEventListeners } from "@ecom/features/events/listeners";
import { JobQueue } from "@ecom/features/queue/JobQueue";
import { queueCleanupJob, registerCleanupWorker } from "@ecom/features/queue/workers/cleanupWorker";
import { registerEmailWorker } from "@ecom/features/queue/workers/emailWorker";
import { registerFallbackEmailWorker } from "@ecom/features/queue/workers/fallbackEmailWorker";
import {
  queueScheduledNotificationsJob,
  registerScheduledNotificationWorker,
} from "@ecom/features/queue/workers/scheduledNotificationWorker";
import { gracefulShutdown } from "@ecom/features/shutdown/GracefulShutdown";
import { prisma } from "@ecom/prisma";
import { decodeToken, verifyToken } from "@flash-ship/ecom-lib/jwt";
import { createLogger } from "@flash-ship/ecom-lib/logger";
import { getCachedSession, setCachedSession } from "@flash-ship/ecom-lib/session-cache";
import type { AuthUser } from "@flash-ship/ecom-types";
import { ClassSerializerInterceptor, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost, NestFactory, Reflector } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { useContainer } from "class-validator";
import compression from "compression";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ErrorWithCodeExceptionFilter } from "./common/filters/error-with-code-exception.filter";
import { I18nHttpExceptionFilter } from "./common/filters/i18n-http-exception.filter";
import { I18nValidationExceptionFilter } from "./common/filters/i18n-validation-exception.filter";
import { PrismaClientExceptionFilter } from "./common/filters/prisma-client-exception.filter";
import { NestLogger } from "./common/logger/nest-logger.service";

const authLogger = createLogger("AuthSessionCache");

async function resolveAdminUser(userId: string, tokenVersion?: number): Promise<AuthUser | null> {
  const versionKey = typeof tokenVersion === "number" ? tokenVersion : "latest";
  const cacheKey = `session:user:admin:${userId}:${versionKey}`;

  const cached = (await getCachedSession(cacheKey)) as AuthUser | null;
  if (cached) {
    authLogger.debug("[AuthCache] HIT", { cacheKey });
    return cached;
  }
  authLogger.debug("[AuthCache] MISS", { cacheKey });

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      locale: true,
      tokenVersion: true,
      roles: {
        select: {
          role: {
            select: {
              name: true,
              permissions: {
                select: {
                  permission: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!dbUser) return null;
  if (typeof tokenVersion === "number" && tokenVersion !== dbUser.tokenVersion) {
    return null;
  }

  const user: AuthUser = {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name ?? null,
    username: dbUser.username,
    locale: dbUser.locale ?? null,
    permissions: resolveUserPermissions(dbUser),
  };

  await setCachedSession(cacheKey, user as unknown as Record<string, unknown>, 10);
  return user;
}

async function resolveCustomerUser(userId: string, tokenVersion?: number): Promise<AuthUser | null> {
  const versionKey = typeof tokenVersion === "number" ? tokenVersion : "latest";
  const cacheKey = `session:user:customer:${userId}:${versionKey}`;

  const cached = (await getCachedSession(cacheKey)) as AuthUser | null;
  if (cached) {
    authLogger.debug("[AuthCache] HIT", { cacheKey });
    return cached;
  }
  authLogger.debug("[AuthCache] MISS", { cacheKey });

  const dbCustomer = await prisma.customer.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, username: true, status: true, tokenVersion: true },
  });

  if (dbCustomer?.status !== "ACTIVE") return null;
  if (typeof tokenVersion === "number" && tokenVersion !== dbCustomer.tokenVersion) {
    return null;
  }

  const customer: AuthUser = {
    id: dbCustomer.id,
    email: dbCustomer.email,
    name: dbCustomer.name ?? null,
    username: dbCustomer.username,
    locale: "vi",
    permissions: [] as string[],
  };

  await setCachedSession(cacheKey, customer as unknown as Record<string, unknown>, 10);
  return customer;
}

async function verifyAndResolveCustomerToken(token: string) {
  try {
    const { getCustomerTokenService } = await import(
      "@ecom/features/di/containers/CustomerService"
    );
    const payload = await getCustomerTokenService().verifyAccessToken(token);
    return payload?.sub ? await resolveCustomerUser(payload.sub) : null;
  } catch {
    return null;
  }
}

async function verifyAndResolveAdminToken(token: string) {
  try {
    const payload = verifyToken(token);
    const userId = payload?.userId || payload?.sub;
    if (!userId) return null;

    const adminUser = await resolveAdminUser(userId, payload.tokenVersion);
    if (adminUser) return adminUser;

    return await resolveCustomerUser(userId, payload.tokenVersion);
  } catch {
    return null;
  }
}

async function resolveUserFromAuthHeader(authHeader?: string) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);

  const decoded = decodeToken(token) as { aud?: string | string[] } | null;
  if (!decoded) return null;

  const audience = Array.isArray(decoded.aud) ? decoded.aud[0] : decoded.aud;

  if (audience === "ecom-customer") {
    return await verifyAndResolveCustomerToken(token);
  }
  return await verifyAndResolveAdminToken(token);
}

async function bootstrap() {
  // Initialize domain event listeners
  registerEventListeners();

  // Start background Outbox worker
  const { outboxWorker } = await import("@ecom/features/events/OutboxWorker");
  outboxWorker.start();
  console.log("📦 Transactional Outbox worker started");

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new NestLogger(),
  });

  // Enable NestJS native shutdown hooks immediately
  app.enableShutdownHooks();

  app.set("trust proxy", true);

  app.useStaticAssets(join(process.cwd(), "public"), {
    prefix: "/public/",
  });

  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads/",
  });

  app.use(helmet());
  app.use(compression());

  const trpcExpress = await import("@trpc/server/adapters/express");
  const { appRouter, createContext } = await import("@flash-ship/ecom-trpc-types/server");

  app.use(
    "/api/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: async ({ req }: { req: import("express").Request }) => {
        const user = await resolveUserFromAuthHeader(req.headers.authorization);
        return createContext({
          user,
          ip: (req.headers["x-forwarded-for"] as string) ?? req.socket.remoteAddress ?? null,
          userAgent: req.headers["user-agent"] ?? null,
          locale: (req.headers["x-locale"] as string) ?? null,
        });
      },
    }),
  );

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new PrismaClientExceptionFilter(httpAdapter),
    new ErrorWithCodeExceptionFilter(),
    new I18nValidationExceptionFilter(),
    new I18nHttpExceptionFilter(),
  );

  const configService = app.get(ConfigService);

  // SEC-05: CORS multi-origin support — whitelist Web, Customer, and Admin apps
  const defaultDevOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
  ];

  const envOrigins = [
    configService.get<string>("WEB_URL"),
    configService.get<string>("CUSTOMER_APP_URL"),
    configService.get<string>("ADMIN_URL"),
  ].filter(Boolean) as string[];

  const allowedOrigins = Array.from(new Set([...defaultDevOrigins, ...envOrigins]));

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (mobile apps, server-to-server, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });

  const isProd = configService.get<string>("NODE_ENV") === "production";
  if (!isProd) {
    const { setupSwagger } = await import("./setup-swagger.js");
    setupSwagger(app);
  }

  const port = configService.get<number>("API_PORT") ?? 4000;
  await app.listen(port);
  console.log(`🚀 API v1 running on http://localhost:${port}/api/v1`);
  if (!isProd) {
    console.log(`📚 Customer Swagger docs: http://localhost:${port}/api/v1/docs/customer`);
    console.log(`📚 Admin Swagger docs:    http://localhost:${port}/api/v1/docs/admin`);
  }

  // Register graceful shutdown cleanup handlers
  gracefulShutdown.register("HTTP Server", async () => {
    await app.close();
  });

  gracefulShutdown.register("Prisma", async () => {
    const { prisma } = await import("@ecom/prisma");
    await prisma.$disconnect();
  });

  gracefulShutdown.register("Redis", async () => {
    const { disconnectRedis } = await import("@flash-ship/ecom-lib/redis");
    await disconnectRedis();
  });

  gracefulShutdown.register("OutboxWorker", async () => {
    const { outboxWorker } = await import("@ecom/features/events/OutboxWorker");
    outboxWorker.stop();
  });

  gracefulShutdown.enable();

  // Start background email queue worker
  registerEmailWorker();
  JobQueue.startWorker("email");
  console.log("✉️  Email queue worker started");

  // Start background fallback email worker for smart routing
  registerFallbackEmailWorker();
  JobQueue.startWorker("fallback-email");
  console.log("✉️  Fallback email queue worker started");

  // Start background database cleanup worker
  registerCleanupWorker();
  JobQueue.startWorker("cleanup");
  queueCleanupJob().catch((err) => {
    console.warn("⚠️ Failed to schedule background database cleanup job:", err);
  });
  console.log("🧹 Database cleanup worker started");

  // Start background scheduled notifications worker
  registerScheduledNotificationWorker();
  JobQueue.startWorker("scheduled-notifications");
  queueScheduledNotificationsJob().catch((err) => {
    console.warn("⚠️ Failed to schedule background notifications dispatch job:", err);
  });
  console.log("⏰ Scheduled notifications dispatch worker started");

  // Start background webhook delivery worker
  const { registerWebhookWorker } = await import("@ecom/features/queue/workers/webhookWorker");
  registerWebhookWorker();
  JobQueue.startWorker("webhook-delivery");
  console.log("🔗 Webhook queue worker started");
}

bootstrap();
