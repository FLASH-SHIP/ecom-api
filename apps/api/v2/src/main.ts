import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { I18nValidationException } from "./common/exceptions/i18n-validation.exception";
import { I18nHttpExceptionFilter } from "./common/filters/i18n-http-exception.filter";
import { I18nValidationExceptionFilter } from "./common/filters/i18n-validation-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v2");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new I18nValidationException(errors),
    }),
  );

  app.useGlobalFilters(new I18nHttpExceptionFilter(), new I18nValidationExceptionFilter());

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
