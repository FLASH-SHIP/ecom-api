import { ContentTemplateRepository } from "@ecom/features/template/repositories/ContentTemplateRepository";
import { ContentTemplateService } from "@ecom/features/template/services/ContentTemplateService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const getTemplateService = () =>
  new ContentTemplateService({ templateRepo: new ContentTemplateRepository() });

export const list = authedProcedure
  .use(requirePermission(Permissions.POSTS_READ))
  .input(
    z
      .object({
        type: z.string().max(50).optional(),
        search: z.string().max(200).optional(),
        isActive: z.boolean().optional(),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    return getTemplateService().list(input ?? {});
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.POSTS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    return getTemplateService().get(input.id);
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.POSTS_CREATE))
  .use(auditLog({ module: "templates", action: "CREATE", entityType: "ContentTemplate" }))
  .input(
    z.object({
      name: z.string().min(1).max(200),
      slug: z.string().min(1).max(200),
      type: z.enum(["post", "page", "email"]),
      content: z.string().optional(),
      structure: z.record(z.string(), z.unknown()).optional(),
      thumbnail: z.string().url().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return getTemplateService().create({ ...input, createdBy: ctx.user.id });
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(auditLog({ module: "templates", action: "UPDATE", entityType: "ContentTemplate" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(200).optional(),
      slug: z.string().min(1).max(200).optional(),
      content: z.string().optional(),
      structure: z.record(z.string(), z.unknown()).optional(),
      thumbnail: z.string().url().optional(),
      isActive: z.boolean().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    return getTemplateService().update(id, data);
  });

export const duplicate = authedProcedure
  .use(requirePermission(Permissions.POSTS_CREATE))
  .use(auditLog({ module: "templates", action: "DUPLICATE", entityType: "ContentTemplate" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    return getTemplateService().duplicate(input.id);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.POSTS_DELETE))
  .use(auditLog({ module: "templates", action: "DELETE", entityType: "ContentTemplate" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    return getTemplateService().delete(input.id);
  });
