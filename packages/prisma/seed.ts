/**
 * Seed runner — orchestrates all seeders via the Seeder Registry.
 *
 * Usage:
 *   yarn prisma:seed                 — run all seeders
 *   SEED_ONLY=CustomFields yarn prisma:seed  — run only matching seeder(s)
 *
 * Production safety:
 *   NODE_ENV=production → blocked by default
 *   ALLOW_PROD_SEED=1 NODE_ENV=production yarn prisma:seed → explicit override
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { PrismaPg } from "@prisma/adapter-pg";
import { SEEDERS } from "./seeders/index";
import { PrismaClient } from "./src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// ── Production guard ──────────────────────────────────────────────────────────

function assertNotProduction() {
  const isProd = process.env.NODE_ENV === "production";
  const override = process.env.ALLOW_PROD_SEED === "1";

  if (isProd && !override) {
    console.error(`
╔══════════════════════════════════════════════════════════════╗
║  ⛔  SEED BLOCKED — Production environment detected          ║
║                                                              ║
║  Running seed on production can overwrite live data.         ║
║  To run on production intentionally (e.g. first deploy):     ║
║    ALLOW_PROD_SEED=1 yarn prisma:seed                        ║
╚══════════════════════════════════════════════════════════════╝
    `);
    process.exit(1);
  }

  if (isProd && override) {
    console.warn("⚠️  WARNING: Running on PRODUCTION with ALLOW_PROD_SEED=1 override\n");
  }
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function main() {
  assertNotProduction();

  const env = process.env.NODE_ENV ?? "development";
  const only = process.env.SEED_ONLY; // e.g. "CustomFields" → partial match

  // Filter seeders if SEED_ONLY is set
  const seeders = only
    ? SEEDERS.filter((s) => s.name.toLowerCase().includes(only.toLowerCase()))
    : SEEDERS;

  if (only && seeders.length === 0) {
    console.error(`❌ No seeders match SEED_ONLY="${only}"`);
    console.error(`   Available: ${SEEDERS.map((s) => s.name).join(", ")}`);
    process.exit(1);
  }

  console.log(`🌱 Seeding [${env}]${only ? ` — filter: "${only}"` : ""}`);
  console.log(`   Running ${seeders.length}/${SEEDERS.length} seeders\n`);

  for (const seeder of seeders) {
    const start = Date.now();
    process.stdout.write(`  ⟳  ${seeder.name}...`);
    try {
      await seeder.run(prisma);
      const ms = Date.now() - start;
      console.log(`\r  ✅ ${seeder.name} (${ms}ms)`);
    } catch (err) {
      console.log(`\r  ❌ ${seeder.name} FAILED`);
      throw err; // Let the outer catch handle disconnect + exit
    }
  }

  console.log("\n🎉 Seed completed!");
}

// ── Entry point ───────────────────────────────────────────────────────────────

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("\n❌ Seed error:", e.message ?? e);
    await prisma.$disconnect();
    process.exit(1);
  });
