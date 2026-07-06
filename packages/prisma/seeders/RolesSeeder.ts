import { ALL_PERMISSIONS } from "@ecom/lib/permissions";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { Seeder } from "./seeder.interface";

export const RolesSeeder: Seeder = {
  name: "Roles & Permissions",

  async run(prisma: PrismaClient) {
    // ── Upsert roles ───────────────────────────────────────────────────────
    const superAdminRole = await prisma.role.upsert({
      where: { name: "admin" },
      update: { displayName: "Super Admin", description: "Full access to all CMS features" },
      create: {
        name: "admin",
        displayName: "Super Admin",
        description: "Full access to all CMS features",
      },
    });

    const editorRole = await prisma.role.upsert({
      where: { name: "editor" },
      update: { displayName: "Editor", description: "Manage blog posts, pages, and media" },
      create: {
        name: "editor",
        displayName: "Editor",
        description: "Manage blog posts, pages, and media",
      },
    });

    const viewerRole = await prisma.role.upsert({
      where: { name: "viewer" },
      update: { displayName: "Viewer", description: "Read-only access" },
      create: { name: "viewer", displayName: "Viewer", description: "Read-only access" },
    });

    // Clean up renamed legacy role
    await prisma.role.deleteMany({ where: { name: "super-admin" } });

    // ── Assign role permissions — batch instead of N upserts ──────────────
    //
    // Strategy:
    //  1. Fetch all relevant permission IDs in one query
    //  2. Fetch existing assignments in one query
    //  3. createMany only the MISSING ones (skipDuplicates)
    //
    // This is additive-only — existing custom assignments are untouched.

    const allPerms = await prisma.permission.findMany({ select: { id: true, name: true } });
    const permByName = new Map(allPerms.map((p) => [p.name, p.id]));

    const editorPermNames = new Set(
      ALL_PERMISSIONS.filter(
        (p) =>
          p.group === "blog" ||
          p.group === "pages" ||
          p.group === "media" ||
          p.group === "comments",
      ).map((p) => p.name),
    );

    const viewerPermNames = new Set(
      ALL_PERMISSIONS.filter((p) => p.name.endsWith(".read")).map((p) => p.name),
    );

    async function syncRolePerms(roleId: string, permNames: Set<string>) {
      const targetPermIds = [...permNames]
        .map((name) => permByName.get(name))
        .filter((id): id is string => id !== undefined);

      // Fetch what's already assigned — 1 query
      const existing = await prisma.rolePermission.findMany({
        where: { roleId },
        select: { permissionId: true },
      });
      const existingIds = new Set(existing.map((r) => r.permissionId));

      // Only insert the missing ones — 1 query
      const missing = targetPermIds.filter((id) => !existingIds.has(id));
      if (missing.length > 0) {
        await prisma.rolePermission.createMany({
          data: missing.map((permissionId) => ({ roleId, permissionId })),
          skipDuplicates: true,
        });
      }

      return targetPermIds.length;
    }

    const adminCount = await syncRolePerms(superAdminRole.id, new Set(allPerms.map((p) => p.name)));
    const editorCount = await syncRolePerms(editorRole.id, editorPermNames);
    const viewerCount = await syncRolePerms(viewerRole.id, viewerPermNames);

    console.log(
      `    → admin: ${adminCount} perms | editor: ${editorCount} perms | viewer: ${viewerCount} perms`,
    );
  },
};
