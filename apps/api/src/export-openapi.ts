import "./load-env";
import "./bootstrap-env";
import "reflect-metadata";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { setupSwagger } from "./setup-swagger.js";

async function exportOpenApi() {
  const arg = process.argv[2]?.toLowerCase() ?? "all";
  const target = arg.replace(/^--target=/, "");

  const app = await NestFactory.create(AppModule, { logger: false });

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  const { customerDocument, adminDocument } = setupSwagger(app);
  const rootDocsDir = join(process.cwd(), "../../../docs");
  const outputDir = existsSync(rootDocsDir)
    ? join(rootDocsDir, "api")
    : join(process.cwd(), "../../docs/api");

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  if (target === "all" || target === "customer") {
    const customerJsonPath = join(outputDir, "openapi-customer.json");
    writeFileSync(customerJsonPath, JSON.stringify(customerDocument, null, 2), "utf-8");
    console.log(`✅ Exported Customer OpenAPI JSON spec to ${customerJsonPath}`);
  }

  if (target === "all" || target === "admin") {
    const adminJsonPath = join(outputDir, "openapi-admin.json");
    writeFileSync(adminJsonPath, JSON.stringify(adminDocument, null, 2), "utf-8");
    console.log(`✅ Exported Admin OpenAPI JSON spec to ${adminJsonPath}`);
  }

  await app.close();
  process.exit(0);
}

exportOpenApi().catch((err) => {
  console.error("❌ Failed to export OpenAPI spec:", err);
  process.exit(1);
});
