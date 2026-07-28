import { getRoleService } from "@ecom/features/di/containers/RbacService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { RedisCache } from "@flash-ship/ecom-lib/redis";
import { invalidateCachedSession } from "@flash-ship/ecom-lib/session-cache";
import { prisma } from "@ecom/prisma";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const list = authedProcedure
  .use(requirePermission(Permissions.ROLES_READ))
  .query(async () => {
    const roleService = getRoleService();
    return roleService.listRoles();
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.ROLES_READ))
  .input(z.object({ id: z.coerce.number() }))
  .query(async ({ input }) => {
    const roleService = getRoleService();
    return roleService.getRole(input.id);
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.ROLES_CREATE))
  .use(auditLog({ module: "roles", action: "CREATE", entityType: "Role" }))
  .input(
    z.object({
      name: z.string().min(1).max(50),
      displayName: z.string().max(100).optional(),
      description: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const roleService = getRoleService();
    return roleService.createRole(input);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.ROLES_UPDATE))
  .use(auditLog({ module: "roles", action: "UPDATE", entityType: "Role" }))
  .input(
    z.object({
      id: z.coerce.number(),
      displayName: z.string().max(100).optional(),
      description: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const roleService = getRoleService();
    return roleService.updateRole(id, data);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.ROLES_DELETE))
  .use(auditLog({ module: "roles", action: "DELETE", entityType: "Role" }))
  .input(z.object({ id: z.coerce.number() }))
  .mutation(async ({ input }) => {
    // Get all users associated with this role before deletion
    const userRoles = await prisma.userRoleAssignment.findMany({
      where: { roleId: input.id },
      select: { userId: true },
    });
    const userIds = userRoles.map((ur) => ur.userId);

    const roleService = getRoleService();
    const result = await roleService.deleteRole(input.id);

    if (userIds.length > 0) {
      // Invalidate permission cache for all affected users
      const permissionsCache = new RedisCache<string[]>("user-permissions", 3600);
      for (const userId of userIds) {
        await permissionsCache.invalidate(`user:${userId}`).catch(() => {});
      }

      // Invalidate NextAuth sessions for all affected users
      const sessions = await prisma.session.findMany({
        where: { userId: { in: userIds } },
        select: { sessionToken: true },
      });

      for (const session of sessions) {
        await invalidateCachedSession(`admin_session:${session.sessionToken}`).catch(() => {});
      }
    }

    return result;
  });

export const syncPermissions = authedProcedure
  .use(requirePermission(Permissions.ROLES_UPDATE))
  .use(auditLog({ module: "roles", action: "SYNC_PERMISSIONS", entityType: "Role" }))
  .input(
    z.object({
      roleId: z.coerce.number(),
      permissionIds: z.array(z.coerce.number()),
    }),
  )
  .mutation(async ({ input }) => {
    const roleService = getRoleService();
    const result = await roleService.syncPermissions(input.roleId, input.permissionIds);

    // Get all users associated with this role
    const userRoles = await prisma.userRoleAssignment.findMany({
      where: { roleId: input.roleId },
      select: { userId: true },
    });
    const userIds = userRoles.map((ur) => ur.userId);

    if (userIds.length > 0) {
      // Invalidate permission cache for all affected users
      const permissionsCache = new RedisCache<string[]>("user-permissions", 3600);
      for (const userId of userIds) {
        await permissionsCache.invalidate(`user:${userId}`).catch(() => {});
      }

      // Invalidate NextAuth sessions for all affected users
      const sessions = await prisma.session.findMany({
        where: { userId: { in: userIds } },
        select: { sessionToken: true },
      });

      for (const session of sessions) {
        await invalidateCachedSession(`admin_session:${session.sessionToken}`);
      }
    }

    return result;
  });

export const permissions = authedProcedure
  .use(requirePermission(Permissions.ROLES_READ))
  .query(async () => {
    const roleService = getRoleService();
    return roleService.listPermissions();
  });
