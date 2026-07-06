import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

export const TransportModesSeeder: Seeder = {
  name: "Transport Modes",

  async run(prisma: PrismaClient) {
    const modes = [
      { id: "ocean", name: "Ocean", isActive: true },
      { id: "air", name: "Air", isActive: true },
      { id: "rail", name: "Rail", isActive: true },
      { id: "truck", name: "Truck", isActive: true },
    ];

    for (const mode of modes) {
      await prisma.transportMode.upsert({
        where: { id: mode.id },
        update: { name: mode.name, isActive: mode.isActive },
        create: {
          id: mode.id,
          name: mode.name,
          isActive: mode.isActive,
        },
      });
    }

    console.log(`    → ${modes.length} transport modes seeded`);
  },
};
