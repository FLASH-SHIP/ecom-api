import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

// Robust RFC 4180-compliant single-pass CSV parser
function parseCSV(content: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = "";
      } else if (char === '\r' || char === '\n') {
        row.push(current);
        current = "";
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
      } else {
        current += char;
      }
    }
  }

  if (current !== "" || row.length > 0) {
    row.push(current);
    result.push(row);
  }

  return result;
}

export const HsCodeCsvSeeder: Seeder = {
  name: "HsCodeCsv",

  async run(prisma: PrismaClient) {
    // 1. Locate the seeders/data directory
    let dataDir = path.join(process.cwd(), "packages/prisma/seeders/data");
    if (!fs.existsSync(dataDir)) {
      dataDir = path.join(process.cwd(), "../../packages/prisma/seeders/data");
    }
    if (!fs.existsSync(dataDir)) {
      dataDir = path.join(process.cwd(), "seeders/data");
    }
    if (!fs.existsSync(dataDir)) {
      throw new Error(`Data directory not found. Checked: ${dataDir}`);
    }

    const crawlCsvPath = path.join(dataDir, "crawl_hscode.csv");
    const flexportCsvPath = path.join(dataDir, "hscode_flexport.csv");

    const BATCH_SIZE = 2000;

    // ─── PART 1: Seed crawl_hscode ──────────────────────────────────────────
    if (fs.existsSync(crawlCsvPath)) {
      console.log(`    → Parsing ${path.basename(crawlCsvPath)}...`);
      const content = fs.readFileSync(crawlCsvPath, "utf-8");
      const rows = parseCSV(content);

      // Remove header row
      rows.shift();
      console.log(`    → Found ${rows.length} rows to seed into crawl_hscode.`);

      // Convert rows to Prisma input
      const items = rows.map((row) => {
        const no = parseInt(row[0] ?? "", 10);
        return {
          no: isNaN(no) ? 0 : no,
          portOfClearance: row[1] || null,
          hsCode: row[2] || null,
          articleDescription: row[3] || null,
          generalRateOfDuty: row[4] || null,
          section301TariffsRate: row[5] || null,
          additionalTariffsRate: row[6] || null,
          antidumpingDutyRate: row[7] || null,
          countervailingDutyRate: row[8] || null,
          notes: row[9] || null,
        };
      }).filter((item) => item.no !== 0); // Skip invalid rows

      // Batch insert with skipDuplicates
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        await prisma.crawlHsCode.createMany({
          data: batch,
          skipDuplicates: true,
        });
        process.stdout.write(`      * Inserted crawl_hscode batch ${Math.min(i + BATCH_SIZE, items.length)}/${items.length}\r`);
      }
      console.log(`\n    → Successfully seeded crawl_hscode.`);
    } else {
      console.warn(`    ⚠️ File not found: ${crawlCsvPath}`);
    }

    // ─── PART 2: Seed hscode_flexport ───────────────────────────────────────
    if (fs.existsSync(flexportCsvPath)) {
      console.log(`    → Parsing ${path.basename(flexportCsvPath)}...`);
      const content = fs.readFileSync(flexportCsvPath, "utf-8");
      const rows = parseCSV(content);

      // Remove header row
      rows.shift();
      console.log(`    → Found ${rows.length} rows to seed into hscode_flexport.`);

      // Convert rows to Prisma input
      const items = rows.map((row) => {
        return {
          code: row[0] ?? "",
          description: row[1] || null,
          generalRate: row[2] || null,
          column2Rate: row[3] || null,
          specialRate: row[4] || null,
          unitsofQuantity: row[5] || null,
        };
      }).filter((item) => item.code !== ""); // Skip rows with empty code

      // Batch insert with skipDuplicates
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        await prisma.hsCodeFlexport.createMany({
          data: batch,
          skipDuplicates: true,
        });
        process.stdout.write(`      * Inserted hscode_flexport batch ${Math.min(i + BATCH_SIZE, items.length)}/${items.length}\r`);
      }
      console.log(`\n    → Successfully seeded hscode_flexport.`);
    } else {
      console.warn(`    ⚠️ File not found: ${flexportCsvPath}`);
    }
  },
};
