import type { PrismaClient } from "@prisma/client";
import type { Seeder } from "./seeder.interface";

export const AdminUserSeeder: Seeder = {
  name: "Admin User",

  async run(prisma: PrismaClient) {
    // Find super admin role
    const superAdminRole = await prisma.role.findUnique({
      where: { name: "admin" },
      select: { id: true },
    });

    if (!superAdminRole) {
      throw new Error('Role "admin" not found — run RolesSeeder first');
    }

    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email: "admin@ecom.com" },
      select: { id: true, email: true },
    });

    let userId: number;

    if (existing) {
      // User already exists — NEVER overwrite password or profile on re-seed
      userId = existing.id;
      console.log("    → Admin already exists, skipped");
    } else {
      // First-time: create with default password
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash("password123", 12);

      const created = await prisma.user.create({
        data: {
          email: "admin@ecom.com",
          username: "admin",
          name: "Admin",
          emailVerified: new Date(),
          password: { create: { hash } },
        },
        select: { id: true },
      });
      userId = created.id;
      console.log("    → Created admin@ecom.com (password: password123)");
    }

    // Ensure admin role assignment (additive)
    await prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId, roleId: superAdminRole.id } },
      update: {},
      create: { userId, roleId: superAdminRole.id },
    });
  },
};
