import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

export const PackingTypesSeeder: Seeder = {
  name: "Packing Types",

  async run(prisma: PrismaClient) {
    const packingTypes = [
      {
        name: "Cardboard box",
        image: "/assets/images/packing-types/cardboard-box.svg",
        description: "Standard cardboard box for secure shipping",
        status: "PUBLISHED" as const,
      },
      {
        name: "Package bag",
        image: "/assets/images/packing-types/packing-bag.svg",
        description: "Flexible plastic package bag for lightweight items",
        status: "PUBLISHED" as const,
      },
    ];

    for (const packingType of packingTypes) {
      await prisma.packingType.upsert({
        where: { name: packingType.name },
        update: {
          image: packingType.image,
          description: packingType.description,
          status: packingType.status,
        },
        create: {
          name: packingType.name,
          image: packingType.image,
          description: packingType.description,
          status: packingType.status,
        },
      });
    }

    console.log(`    → ${packingTypes.length} packing types seeded`);
  },
};
