import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { CustomerAuthModule } from "./modules/customer-auth/customer-auth.module";
import { CustomerOrderModule } from "./modules/customer-orders/customer-order.module";
import { CustomerWebhookModule } from "./modules/customer-webhooks/customer-webhook.module";

/**
 * Configure and mount Swagger UI documentation endpoints:
 * 1. Customer Public B2B API Specs -> /api/v1/docs/customer (and /api/v1/docs fallback)
 * 2. Internal Admin API Specs       -> /api/v1/docs/admin
 */
export function setupSwagger(app: INestApplication) {
  // 1. Customer & B2B Public OpenAPI Document
  const customerConfig = new DocumentBuilder()
    .setTitle("Ecom Customer & B2B API")
    .setDescription(
      "Public REST API Gateway for Customer Web App, Mobile App, Chrome Extension, and B2B Integration Partners.",
    )
    .setVersion("1.0.0")
    .addBearerAuth({
      type: "http",
      scheme: "bearer",
      bearerFormat: "API Key / JWT",
      description: "Enter Customer API Key (ecom_cust_...) or Bearer JWT Access Token",
    })
    .build();

  const customerDocument = SwaggerModule.createDocument(app, customerConfig, {
    include: [CustomerAuthModule, CustomerOrderModule, CustomerWebhookModule],
  });

  // Mount Customer Swagger UI at /api/v1/docs/customer and backward-compatible /api/v1/docs
  SwaggerModule.setup("api/v1/docs/customer", app, customerDocument);
  SwaggerModule.setup("api/v1/docs", app, customerDocument);

  // 2. Internal Admin System OpenAPI Document
  const adminConfig = new DocumentBuilder()
    .setTitle("Ecom Internal Admin API")
    .setDescription(
      "Internal Administration & Management REST API for Admin CMS, System Operations, and Queue Dashboards.",
    )
    .setVersion("1.0.0")
    .addBearerAuth({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT / Session",
      description: "Enter Admin JWT Access Token or Session Token",
    })
    .build();

  const adminDocument = SwaggerModule.createDocument(app, adminConfig);
  SwaggerModule.setup("api/v1/docs/admin", app, adminDocument);

  return { customerDocument, adminDocument };
}
