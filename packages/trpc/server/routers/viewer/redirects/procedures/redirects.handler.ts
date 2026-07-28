import { RedirectRepository } from "@ecom/features/seo/repositories/RedirectRepository";
import { RedirectService } from "@ecom/features/seo/services/RedirectService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const getRedirectService = () => new RedirectService({ redirectRepo: new RedirectRepository() });

export const list = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(
    z
      .object({
        search: z.string().max(200).optional(),
        isActive: z.boolean().optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(500).default(50),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const service = getRedirectService();
    return service.list(input ?? {});
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "redirects", action: "CREATE", entityType: "Redirect" }))
  .input(
    z.object({
      fromPath: z.string().min(1).max(2000),
      toPath: z.string().min(1).max(2000),
      statusCode: z.number().int().min(300).max(399).default(301),
      note: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const service = getRedirectService();
    return service.create(input);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "redirects", action: "UPDATE", entityType: "Redirect" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      fromPath: z.string().min(1).max(2000).optional(),
      toPath: z.string().min(1).max(2000).optional(),
      statusCode: z.number().int().min(300).max(399).optional(),
      isActive: z.boolean().optional(),
      note: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const service = getRedirectService();
    return service.update(id, data);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "redirects", action: "DELETE", entityType: "Redirect" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const service = getRedirectService();
    return service.delete(input.id);
  });
