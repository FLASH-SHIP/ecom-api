import { getRoleService } from "@ecom/features/di/containers/RbacService";
import { Permissions } from "@ecom/lib/permissions";
import { auditLog } from "@ecom/trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@ecom/trpc/server/trpc";
import { z } from "zod";

export const list = authedProcedure
  .use(requirePermission(Permissions.ROLES_READ))
  .query(async () => {
    const roleService = getRoleService();
    return roleService.listRoles();
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.ROLES_READ))
  .input(z.object({ id: z.string().min(1) }))
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
      id: z.string().min(1),
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
  .input(z.object({ id: z.string().min(1) }))
  .mutation(async ({ input }) => {
    const roleService = getRoleService();
    return roleService.deleteRole(input.id);
  });

export const syncPermissions = authedProcedure
  .use(requirePermission(Permissions.ROLES_UPDATE))
  .use(auditLog({ module: "roles", action: "SYNC_PERMISSIONS", entityType: "Role" }))
  .input(
    z.object({
      roleId: z.string().min(1),
      permissionIds: z.array(z.string().min(1)),
    }),
  )
  .mutation(async ({ input }) => {
    const roleService = getRoleService();
    return roleService.syncPermissions(input.roleId, input.permissionIds);
  });

export const permissions = authedProcedure
  .use(requirePermission(Permissions.ROLES_READ))
  .query(async () => {
    const roleService = getRoleService();
    return roleService.listPermissions();
  });
