import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
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

  app.enableCors({
    origin: configService.get<string>("WEB_URL") ?? "http://localhost:3000",
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
