import "./load-env";
import "./bootstrap-env";
import "reflect-metadata";
import { registerEventListeners } from "@ecom/features/events/listeners";
import { JobQueue } from "@ecom/features/queue/JobQueue";
import { queueCleanupJob, registerCleanupWorker } from "@ecom/features/queue/workers/cleanupWorker";
import { registerEmailWorker } from "@ecom/features/queue/workers/emailWorker";
import { gracefulShutdown } from "@ecom/features/shutdown/GracefulShutdown";
import { ClassSerializerInterceptor, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost, NestFactory, Reflector } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { useContainer } from "class-validator";
import compression from "compression";
import helmet from "helmet";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "node:path";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ErrorWithCodeExceptionFilter } from "./common/filters/error-with-code-exception.filter";
import { I18nHttpExceptionFilter } from "./common/filters/i18n-http-exception.filter";
import { I18nValidationExceptionFilter } from "./common/filters/i18n-validation-exception.filter";
import { PrismaClientExceptionFilter } from "./common/filters/prisma-client-exception.filter";
import { NestLogger } from "./common/logger/nest-logger.service";

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

  app.useStaticAssets(join(process.cwd(), "public"), {
    prefix: "/public/",
  });

  app.use(helmet());
  app.use(compression());

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

  // SEC-05: CORS multi-origin support — whitelist both Admin and Customer apps
  const allowedOrigins = [
    configService.get<string>("WEB_URL"),
    configService.get<string>("CUSTOMER_APP_URL"),
    configService.get<string>("ADMIN_URL"),
  ].filter(Boolean) as string[];

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
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Ecom API")
      .setDescription("REST API for Mobile, Extension, and Public clients")
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/v1/docs", app, document);
  }

  const port = configService.get<number>("API_PORT") ?? 4000;
  await app.listen(port);
  console.log(`🚀 API v1 running on http://localhost:${port}/api/v1`);
  if (!isProd) {
    console.log(`📚 Swagger docs: http://localhost:${port}/api/v1/docs`);
  }

  // Enable NestJS native shutdown hooks
  app.enableShutdownHooks();

  // Register graceful shutdown cleanup handlers
  gracefulShutdown.register("Prisma", async () => {
    const { prisma } = await import("@ecom/prisma");
    await prisma.$disconnect();
  });

  gracefulShutdown.register("Redis", async () => {
    const { disconnectRedis } = await import("@ecom/lib/redis");
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

  // Start background database cleanup worker
  registerCleanupWorker();
  JobQueue.startWorker("cleanup");
  queueCleanupJob().catch((err) => {
    console.warn("⚠️ Failed to schedule background database cleanup job:", err);
  });
  console.log("🧹 Database cleanup worker started");
}

bootstrap();
