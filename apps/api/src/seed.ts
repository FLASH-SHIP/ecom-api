import "./bootstrap-env";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { NestLogger } from "./common/logger/nest-logger.service";
import { SeedService } from "./common/seed/seed.service";

async function bootstrap() {
  const isProd = process.env.NODE_ENV === "production";
  const override = process.env.ALLOW_PROD_SEED === "1";

  if (isProd && !override) {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║  ⛔  SEED BLOCKED — Production environment detected          ║
║                                                              ║
║  Running seed on production can overwrite live data.         ║
║  To run on production intentionally (e.g. first deploy):     ║
║    ALLOW_PROD_SEED=1 yarn prisma:seed:nestjs                 ║
╚══════════════════════════════════════════════════════════════╝
    `);
    process.exit(1);
  }

  if (isProd && override) {
    console.warn("⚠️  WARNING: Running on PRODUCTION with ALLOW_PROD_SEED=1 override\n");
  }

  // Create standalone NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: new NestLogger(),
  });

  try {
    const seedService = app.get(SeedService);
    await seedService.run();
    await app.close();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ NestJS CLI Seed failed:", err);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
