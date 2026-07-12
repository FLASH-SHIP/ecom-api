import * as fs from "node:fs";
import * as path from "node:path";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

export const AdministrativeDivisionsSeeder: Seeder = {
  name: "Administrative Divisions",

  async run(prisma: PrismaClient) {
    const provincesPath = path.join(
      __dirname,
      "../../../specs/administrative-divisions/provinces.json",
    );
    const wardsPath = path.join(__dirname, "../../../specs/administrative-divisions/wards.json");
    const errorLogPath = path.join(
      __dirname,
      "../../../specs/administrative-divisions/seeding_errors.log",
    );

    // Initialize or clear error log file
    fs.writeFileSync(
      errorLogPath,
      `Seeding Error Log - Started at ${new Date().toISOString()}\n\n`,
      "utf8",
    );

    let provincesCount = 0;
    let wardsCount = 0;
    let errorsCount = 0;

    // Helper to log errors
    const logError = (type: "Province" | "Ward", code: number, name: string, errMsg: string) => {
      errorsCount++;
      const logEntry = `[${new Date().toISOString()}] Failed to upsert ${type} (code: ${code}, name: "${name}"): ${errMsg}\n`;
      fs.appendFileSync(errorLogPath, logEntry, "utf8");
    };

    // 1. Seed Provinces
    if (fs.existsSync(provincesPath)) {
      const provinces = JSON.parse(fs.readFileSync(provincesPath, "utf8"));
      console.log(`    → Loading ${provinces.length} provinces from provinces.json`);
      for (const p of provinces) {
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
        } catch (err: any) {
          logError("Province", p.code, p.name, err.message || String(err));
        }
      }
    } else {
      console.warn(`    ⚠ Provinces source file not found at ${provincesPath}`);
    }

    // 2. Seed Wards
    if (fs.existsSync(wardsPath)) {
      const Wards = JSON.parse(fs.readFileSync(wardsPath, "utf8"));
      console.log(`    → Loading ${Wards.length} Wards from Wards.json`);
      for (const w of Wards) {
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
        } catch (err: any) {
          logError("Ward", w.code, w.name, err.message || String(err));
        }
      }
    } else {
      console.warn(`    ⚠ Wards source file not found at ${wardsPath}`);
    }

    console.log(
      `    → Seeding complete: ${provincesCount} provinces, ${wardsCount} Wards successfully seeded.`,
    );
    if (errorsCount > 0) {
      console.warn(
        `    ⚠ Encountered ${errorsCount} errors. Details logged to specs/administrative-divisions/seeding_errors.log`,
      );
    }
  },
};
