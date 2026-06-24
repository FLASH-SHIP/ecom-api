import "reflect-metadata";
import { JobQueue } from "@ecom/features/queue/JobQueue";
import { queueCleanupJob, registerCleanupWorker } from "@ecom/features/queue/workers/cleanupWorker";
import { registerEmailWorker } from "@ecom/features/queue/workers/emailWorker";
import { gracefulShutdown } from "@ecom/features/shutdown/GracefulShutdown";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { I18nValidationException } from "./common/exceptions/i18n-validation.exception";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ErrorWithCodeExceptionFilter } from "./common/filters/error-with-code-exception.filter";
import { I18nHttpExceptionFilter } from "./common/filters/i18n-http-exception.filter";
import { I18nValidationExceptionFilter } from "./common/filters/i18n-validation-exception.filter";
import { TimeoutInterceptor } from "./common/interceptors/timeout.interceptor";
import { NestLogger } from "./common/logger/nest-logger.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new NestLogger(),
  });

  app.use(helmet());

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new I18nValidationException(errors),
    }),
  );

  app.useGlobalInterceptors(new TimeoutInterceptor());

  app.useGlobalFilters(
    new I18nHttpExceptionFilter(),
    new I18nValidationExceptionFilter(),
    new ErrorWithCodeExceptionFilter(),
    new AllExceptionsFilter(),
  );

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get<string>("WEB_URL") ?? "http://localhost:3000",
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
