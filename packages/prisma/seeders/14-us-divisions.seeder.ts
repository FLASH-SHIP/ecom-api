import type { PrismaClient } from "../src/generated/prisma/client";
import usCitiesData from "./data/us-cities.json";
import usStatesData from "./data/us-states.json";
import type { Seeder } from "./seeder.interface";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export const UsDivisionsSeeder: Seeder = {
  name: "US Divisions",

  async run(prisma: PrismaClient) {
    let statesCount = 0;
    let citiesCount = 0;
    let errorsCount = 0;
    const errors: string[] = [];

    const logError = (type: string, code: string, name: string, errMsg: string) => {
      errorsCount++;
      errors.push(`Failed to upsert ${type} (code: ${code}, name: "${name}"): ${errMsg}`);
    };

    // 1. Seed US States (level 1)
    console.log(`    → Loading ${usStatesData.length} US states`);
    for (const state of usStatesData) {
      try {
        await prisma.administrativeDivision.upsert({
          where: {
            countryCode_code: { countryCode: "US", code: state.state_id },
          },
          update: { name: state.state_name },
          create: {
            countryCode: "US",
            code: state.state_id,
            name: state.state_name,
            divisionType: "state",
            level: 1,
          },
        });
        statesCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logError("State", state.state_id, state.state_name, msg);
      }
    }

    // 2. Build state lookup map (state_id → DB id)
    const stateRecords = await prisma.administrativeDivision.findMany({
      where: { countryCode: "US", level: 1 },
      select: { id: true, code: true },
    });
    const stateMap = new Map(stateRecords.map((s) => [s.code, s.id]));

    // 3. Seed US Cities (level 2)
    console.log(`    → Loading ${usCitiesData.length} US cities`);

    // Track duplicate codes within this run
    const seenCodes = new Set<string>();

    for (const city of usCitiesData) {
      const parentId = stateMap.get(city.state_id);
      if (!parentId) {
        logError("City", city.state_id, city.city, `Parent state "${city.state_id}" not found`);
        continue;
      }

      let cityCode = `${city.state_id}-${slugify(city.city)}`;

      // Handle duplicate city names within the same state
      if (seenCodes.has(cityCode)) {
        let suffix = 2;
        while (seenCodes.has(`${cityCode}_${suffix}`)) {
          suffix++;
        }
        cityCode = `${cityCode}_${suffix}`;
      }
      seenCodes.add(cityCode);

      try {
        await prisma.administrativeDivision.upsert({
          where: {
            countryCode_code: { countryCode: "US", code: cityCode },
          },
          update: { name: city.city, parentId },
          create: {
            countryCode: "US",
            code: cityCode,
            name: city.city,
            divisionType: "city",
            level: 2,
            parentId,
          },
        });
        citiesCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logError("City", cityCode, city.city, msg);
      }
    }

    console.log(`    → Seeding complete: ${statesCount} states, ${citiesCount} cities seeded.`);
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
