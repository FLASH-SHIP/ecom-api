import { ALL_PERMISSIONS } from "@flash-ship/ecom-lib/permissions";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

export const PermissionsSeeder: Seeder = {
  name: "Permissions",

  async run(prisma: PrismaClient) {
    // ── Batch upsert via createMany + skipDuplicates ─────────────────────────
    // Far more efficient than N individual upserts (58 → 2 queries total).
    //
    // Limitation: createMany can't update existing rows on conflict.
    // Workaround: run a separate updateMany for displayName/group changes.
    // This is safe because permission `name` is the PK-like stable identifier.

    // Step 1: Insert any new permissions (skip existing)
    await prisma.permission.createMany({
      data: ALL_PERMISSIONS.map((p) => ({
        name: p.name,
        displayName: p.displayName,
        group: p.group,
      })),
      skipDuplicates: true,
    });

    // Step 2: Update display metadata for existing permissions
    // (e.g. when a permission name is kept but its label changes)
    for (const perm of ALL_PERMISSIONS) {
      await prisma.permission.update({
        where: { name: perm.name },
        data: { displayName: perm.displayName, group: perm.group },
      });
    }

    // Step 3: Remove permissions that no longer exist in code
    const validNames = ALL_PERMISSIONS.map((p) => p.name);
    const { count } = await prisma.permission.deleteMany({
      where: { name: { notIn: validNames } },
    });

    console.log(
      `    → ${ALL_PERMISSIONS.length} synced${count > 0 ? `, ${count} obsolete removed` : ""}`,
    );
  },
};
