import type { PrismaClient } from "../src/generated/prisma/client";
import provincesData from "./data/provinces.json";
import wardsData from "./data/wards.json";
import type { Seeder } from "./seeder.interface";

// Data is bundled via JSON import — no runtime fs path resolution needed,
// which avoids __dirname breakage when running compiled JS on the server.

export const AdministrativeDivisionsSeeder: Seeder = {
  name: "Administrative Divisions",

  async run(prisma: PrismaClient) {
    let provincesCount = 0;
    let wardsCount = 0;
    let errorsCount = 0;
    const errors: string[] = [];

    // Helper to record errors without crashing the whole seeder
    const logError = (type: "Province" | "Ward", code: number, name: string, errMsg: string) => {
      errorsCount++;
      errors.push(`Failed to upsert ${type} (code: ${code}, name: "${name}"): ${errMsg}`);
    };

    // 1. Seed Provinces
    console.log(`    → Loading ${provincesData.length} provinces`);
    for (const p of provincesData) {
      try {
        await prisma.province.upsert({
          where: { code: p.code },
          update: {
            name: p.name,
            divisionType: p.divisionType,
            codeName: p.codeName,
            phoneCode: p.phoneCode,
          },
          create: {
            name: p.name,
            code: p.code,
            divisionType: p.divisionType,
            codeName: p.codeName,
            phoneCode: p.phoneCode,
          },
        });
        provincesCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logError("Province", p.code, p.name, msg);
      }
    }

    // 2. Seed Wards
    console.log(`    → Loading ${wardsData.length} wards`);
    for (const w of wardsData) {
      try {
        await prisma.ward.upsert({
          where: { code: w.code },
          update: {
            name: w.name,
            divisionType: w.divisionType,
            codeName: w.codeName,
            provinceCode: w.provinceCode,
          },
          create: {
            name: w.name,
            code: w.code,
            divisionType: w.divisionType,
            codeName: w.codeName,
            provinceCode: w.provinceCode,
          },
        });
        wardsCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logError("Ward", w.code, w.name, msg);
      }
    }

    console.log(`    → Seeding complete: ${provincesCount} provinces, ${wardsCount} wards seeded.`);
    if (errorsCount > 0) {
      console.warn(`    ⚠ Encountered ${errorsCount} errors:`);
      for (const e of errors.slice(0, 10)) {
        console.warn(`      - ${e}`);
      }
      if (errors.length > 10) {
        console.warn(`      ... and ${errors.length - 10} more`);
      }
    }
  },
};
