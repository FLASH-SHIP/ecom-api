import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

export const TransportModesSeeder: Seeder = {
  name: "Transport Modes",

  async run(prisma: PrismaClient) {
    const modes = [
      { code: "ocean", name: "Ocean", isActive: true },
      { code: "air", name: "Air", isActive: true },
      { code: "rail", name: "Rail", isActive: true },
      { code: "truck", name: "Truck", isActive: true },
    ];

    for (const mode of modes) {
      await prisma.transportMode.upsert({
        where: { code: mode.code },
        update: { name: mode.name, isActive: mode.isActive },
        create: {
          code: mode.code,
          name: mode.name,
          isActive: mode.isActive,
        },
      });
    }

    console.log(`    → ${modes.length} transport modes seeded`);
  },
};
