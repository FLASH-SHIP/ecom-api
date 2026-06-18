/**
 * Base Seeder interface — every seeder implements this contract.
 *
 * Naming convention: `NN-name.seeder.ts`
 *   NN = 2-digit order prefix (01, 02 …) to control execution order
 *
 * Safety rules every seeder must follow:
 *  - Use `upsert` or `findFirst + create` — never blind `deleteMany` + `createMany`
 *  - Never update fields that could break linked data (e.g. slug, type on FieldItem)
 *  - Settings: `update: {}` so production values are not overwritten
 */

import type { PrismaClient } from "@prisma/client";

export interface Seeder {
  /** Human-readable name shown in logs */
  readonly name: string;

  /**
   * Run the seeder.
   * Must be idempotent — safe to call multiple times.
   */
  run(prisma: PrismaClient): Promise<void>;
}
