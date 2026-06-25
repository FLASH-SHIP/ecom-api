import { prisma } from "@ecom/prisma";
import { SEEDERS } from "@ecom/prisma/seeders/index";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SeedService {
  /**
   * Run the standard seeders from the Prisma package inside the NestJS container context.
   */
  async run() {
    const only = process.env.SEED_ONLY;
    const seeders = only
      ? SEEDERS.filter((s) => s.name.toLowerCase().includes(only.toLowerCase()))
      : SEEDERS;

    const env = process.env.NODE_ENV ?? "development";
    console.log(`🌱 [NestJS CLI] Seeding Database [${env}]${only ? ` — filter: "${only}"` : ""}`);
    console.log(`   Running ${seeders.length}/${SEEDERS.length} seeders...\n`);

    for (const seeder of seeders) {
      const start = Date.now();
      process.stdout.write(`  ⟳  ${seeder.name}...`);
      try {
        await seeder.run(prisma);
        const ms = Date.now() - start;
        console.log(`\r  ✅ ${seeder.name} (${ms}ms)`);
      } catch (err) {
        console.log(`\r  ❌ ${seeder.name} FAILED`);
        throw err;
      }
    }

    console.log("\n🎉 Database seed completed successfully via NestJS CLI!");
  }
}
