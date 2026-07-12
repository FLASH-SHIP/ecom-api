import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const client = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg(client),
  });

  try {
    const tableNames = [
      "User",
      "Role",
      "Permission",
      "Customer",
      "Country",
      "Partner",
      "TransportMode",
      "PackingType",
      "Province",
      "Ward",
      "Language",
      "FieldGroup",
      "FieldItem",
      "CustomFieldValue",
      "RateCard",
    ];

    interface PrismaDelegate {
      count: () => Promise<number>;
      findFirst: (args: { select: { id: boolean } }) => Promise<{ id: string | number } | null>;
    }

    console.log("Checking row counts and sample IDs for tables:");
    for (const name of tableNames) {
      try {
        const delegateName = name.charAt(0).toLowerCase() + name.slice(1);
        const delegate = (prisma as unknown as Record<string, PrismaDelegate | undefined>)[
          delegateName
        ];
        if (delegate) {
          const count = await delegate.count();
          const sample = await delegate.findFirst({
            select: { id: true },
          });
          console.log(`- ${name}: count=${count}, sampleId=${sample ? sample.id : "none"}`);
        } else {
          console.log(`- ${name}: delegate not found`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`- ${name}: Error - ${message}`);
      }
    }
  } catch (error) {
    console.error("Error in check_db:", error);
  } finally {
    await prisma.$disconnect();
    await client.end();
  }
}

main();
