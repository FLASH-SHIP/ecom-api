import { getAdminMenuService } from "@ecom/features/di/containers/AdminMenuService";
import { Permissions } from "@ecom/lib/permissions";
import { auditLog } from "@ecom/trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@ecom/trpc/server/trpc";
import { z } from "zod";

export const tree = authedProcedure
  .use(requirePermission(Permissions.ADMIN_MENUS_READ))
  .query(async () => {
    const service = getAdminMenuService();
    return service.getMenuTree();
  });

export const list = authedProcedure
  .use(requirePermission(Permissions.ADMIN_MENUS_READ))
  .query(async () => {
    const service = getAdminMenuService();
    return service.listAll();
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.ADMIN_MENUS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const service = getAdminMenuService();
    return service.getMenuItem(input.id);
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.ADMIN_MENUS_CREATE))
  .use(auditLog({ module: "admin-menus", action: "CREATE", entityType: "AdminMenu" }))
  .input(
    z.object({
      key: z.string().min(1).max(100),
      name: z.string().min(1).max(200),
      description: z.string().max(500).optional(),
      icon: z.string().max(100).optional(),
      route: z.string().max(200).optional(),
      permissions: z.array(z.string()).optional(),
      childrenDisplay: z.enum(["sidebar", "panel"]).optional(),
      section: z.string().max(100).optional(),
      priority: z.number().int().optional(),
      isActive: z.boolean().optional(),
      parentId: z.number().int().positive().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const service = getAdminMenuService();
    return service.createMenuItem(input);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.ADMIN_MENUS_UPDATE))
  .use(auditLog({ module: "admin-menus", action: "UPDATE", entityType: "AdminMenu" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(500).optional(),
      icon: z.string().max(100).optional(),
      route: z.string().max(200).optional(),
      permissions: z.array(z.string()).optional(),
      childrenDisplay: z.enum(["sidebar", "panel"]).optional(),
      section: z.string().max(100).optional(),
      priority: z.number().int().optional(),
      isActive: z.boolean().optional(),
      parentId: z.number().int().positive().nullable().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const service = getAdminMenuService();
    return service.updateMenuItem(id, data);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.ADMIN_MENUS_DELETE))
  .use(auditLog({ module: "admin-menus", action: "DELETE", entityType: "AdminMenu" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const service = getAdminMenuService();
    return service.deleteMenuItem(input.id);
  });

export const upsertTranslation = authedProcedure
  .use(requirePermission(Permissions.ADMIN_MENUS_UPDATE))
  .use(auditLog({ module: "admin-menus", action: "TRANSLATE", entityType: "AdminMenu" }))
  .input(
    z.object({
      menuItemId: z.number().int().positive(),
      langCode: z.string().min(1).max(10),
      name: z.string().min(1).max(200),
      description: z.string().max(500).optional(),
      section: z.string().max(100).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { menuItemId, langCode, ...data } = input;
    const service = getAdminMenuService();
    return service.upsertTranslation(menuItemId, langCode, data);
  });

export const reorder = authedProcedure
  .use(requirePermission(Permissions.ADMIN_MENUS_UPDATE))
  .use(auditLog({ module: "admin-menus", action: "REORDER", entityType: "AdminMenu" }))
  .input(
    z.object({
      items: z.array(
        z.object({
          id: z.number().int().positive(),
          priority: z.number().int(),
          parentId: z.number().int().positive().nullable().optional(),
        }),
      ),
    }),
  )
  .mutation(async ({ input }) => {
    const service = getAdminMenuService();
    return service.reorder(input.items);
  });
