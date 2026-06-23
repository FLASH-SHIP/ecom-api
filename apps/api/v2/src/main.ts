import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const { NestFactory } = await import("@nestjs/core");
  const { ValidationPipe } = await import("@nestjs/common");
  const { DocumentBuilder, SwaggerModule } = await import("@nestjs/swagger");

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v2");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);

  const nodeEnv = configService.get<string>("NODE_ENV") ?? "development";
  const webUrl = configService.get<string>("WEB_URL") ?? "http://localhost:3000";

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const isAllowed =
        origin === webUrl ||
        (nodeEnv !== "production" &&
          (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")));
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Ecom API")
    .setDescription("REST API for Mobile, Extension, and Public clients")
    .setVersion("2.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/v2/docs", app, document);

  const port = configService.get<number>("API_PORT") ?? 4000;
  await app.listen(port);
  console.log(`🚀 API v2 running on http://localhost:${port}/api/v2`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/v2/docs`);
}

bootstrap();
