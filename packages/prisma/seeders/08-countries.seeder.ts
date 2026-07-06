import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

export const CountriesSeeder: Seeder = {
  name: "Countries",

  async run(prisma: PrismaClient) {
    let flagsDir = path.join(process.cwd(), "apps/api/public/flags");
    if (!fs.existsSync(flagsDir)) {
      flagsDir = path.join(process.cwd(), "../../apps/api/public/flags");
    }
    if (!fs.existsSync(flagsDir)) {
      console.warn(`\n    ⚠️  Flags directory not found at: ${flagsDir}. Skipping dynamic seeding.`);
      return;
    }

    const files = fs.readdirSync(flagsDir);
    const svgFiles = files.filter((f) => f.endsWith(".svg"));
    console.log(`\n    Found ${svgFiles.length} SVG flags in ${flagsDir}`);

    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    let count = 0;

    for (const file of svgFiles) {
      const code = path.basename(file, ".svg").toUpperCase();
      let name = code;
      try {
        name = displayNames.of(code) || code;
      } catch {
        // Fallback to code if country code is not recognized by Intl
      }

      await prisma.country.upsert({
        where: { code },
        update: {
          name,
          flag: `/public/flags/${file}`,
        },
        create: {
          name,
          code,
          flag: `/public/flags/${file}`,
        },
      });
      count++;
    }

    console.log(`    → ${count} countries seeded dynamically from flags folder`);
  },
};
