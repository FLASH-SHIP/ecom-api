import "reflect-metadata";
import * as dotenv from "dotenv";
import * as path from "path";
const envPath = path.join(__dirname, "../../../../.env");
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error("Failed to load .env file from path:", envPath, result.error);
} else {
  console.log("Successfully loaded .env. DATABASE_URL:", process.env.DATABASE_URL);
}

async function bootstrap() {
  const { NestFactory } = await import("@nestjs/core");
  const { ValidationPipe } = await import("@nestjs/common");
  const { DocumentBuilder, SwaggerModule } = await import("@nestjs/swagger");
  const { AppModule } = await import("./app.module");

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v2");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = [
    process.env.WEB_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:4000",
    "http://localhost:4001",
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: allowedOrigins,
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

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  console.log(`🚀 API v2 running on http://localhost:${port}/api/v2`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/v2/docs`);
}

bootstrap();
