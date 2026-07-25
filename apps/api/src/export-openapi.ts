import "./load-env";
import "./bootstrap-env";
import "reflect-metadata";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

import { setupSwagger } from "./setup-swagger.js";

async function exportOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: false });

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  const { customerDocument, adminDocument } = setupSwagger(app);
  const outputDir = join(process.cwd(), "../../docs/api");

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // 1. Export Customer Public API Spec
  const customerJsonPath = join(outputDir, "openapi-customer.json");
  writeFileSync(customerJsonPath, JSON.stringify(customerDocument, null, 2), "utf-8");
  console.log(`✅ Exported Customer OpenAPI JSON spec to ${customerJsonPath}`);

  // 2. Export Admin Internal API Spec
  const adminJsonPath = join(outputDir, "openapi-admin.json");
  writeFileSync(adminJsonPath, JSON.stringify(adminDocument, null, 2), "utf-8");
  console.log(`✅ Exported Admin OpenAPI JSON spec to ${adminJsonPath}`);

  await app.close();
  process.exit(0);
}

exportOpenApi().catch((err) => {
  console.error("❌ Failed to export OpenAPI spec:", err);
  process.exit(1);
});
