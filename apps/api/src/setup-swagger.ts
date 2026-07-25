import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
import { CustomerAuthModule } from "./modules/customer-auth/customer-auth.module.js";
import { CustomerOrderModule } from "./modules/customer-orders/customer-order.module.js";
import { CustomerWebhookModule } from "./modules/customer-webhooks/customer-webhook.module.js";

/**
 * HTTP Basic Authentication middleware for Admin Swagger Documentation endpoints
 */
function adminBasicAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const adminUser = process.env.SWAGGER_ADMIN_USER ?? "admin";
  const adminPass = process.env.SWAGGER_ADMIN_PASSWORD ?? "admin123";

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin API Documentation"');
    return res.status(401).send("Authentication required for Admin API Documentation.");
  }

  const encoded = authHeader.split(" ")[1] ?? "";
  const credentials = Buffer.from(encoded, "base64").toString("utf-8");
  const [username, password] = credentials.split(":");

  if (username === adminUser && password === adminPass) {
    return next();
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Admin API Documentation"');
  return res.status(401).send("Invalid credentials for Admin API Documentation.");
}

/**
 * Configure and mount Swagger UI documentation endpoints:
 * 1. Customer Public B2B API Specs -> /api/v1/docs/customer (Public for partners)
 * 2. Internal Admin API Specs       -> /api/v1/docs/admin (Protected by HTTP Basic Auth)
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

  // Protect Admin Swagger routes with Basic Auth middleware
  app.use(["/api/v1/docs/admin", "/api/v1/docs/admin-json"], adminBasicAuthMiddleware);

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
