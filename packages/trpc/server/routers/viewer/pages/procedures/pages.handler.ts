import { getCustomFieldService } from "@ecom/features/di/containers/CustomFieldService";
import { getPageService } from "@ecom/features/di/containers/PageService";
import { Permissions } from "@ecom/lib/permissions";
import { auditLog } from "@ecom/trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@ecom/trpc/server/trpc";
import { ContentStatus } from "@ecom/prisma";
import { z } from "zod";

export const list = authedProcedure
  .use(requirePermission(Permissions.PAGES_READ))
  .input(
    z
      .object({
        search: z.string().max(200).optional(),
        status: z.nativeEnum(ContentStatus).optional(),
        parentId: z.number().int().nullable().optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(500).default(20),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const pageService = getPageService();
    return pageService.listPages(input ?? {});
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.PAGES_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const pageService = getPageService();
    return pageService.getPage(input.id);
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.PAGES_CREATE))
  .use(auditLog({ module: "pages", action: "CREATE", entityType: "Page" }))
  .input(
    z.object({
      title: z.string().min(1).max(500),
      slug: z.string().min(1).max(500),
      content: z.string().optional(),
      excerpt: z.string().optional(),
      featuredImage: z.string().optional(),
      template: z.string().max(100).optional(),
      order: z.number().int().optional(),
      parentId: z.number().int().positive().optional(),
      status: z.nativeEnum(ContentStatus).optional(),
      scheduledAt: z.string().datetime().nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const pageService = getPageService();
    return pageService.createPage({ ...input, authorId: ctx.user.id });
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.PAGES_UPDATE))
  .use(auditLog({ module: "pages", action: "UPDATE", entityType: "Page" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      title: z.string().min(1).max(500).optional(),
      slug: z.string().min(1).max(500).optional(),
      content: z.string().optional(),
      excerpt: z.string().optional(),
      featuredImage: z.string().optional(),
      template: z.string().max(100).optional(),
      order: z.number().int().optional(),
      parentId: z.number().int().positive().nullable().optional(),
      status: z.nativeEnum(ContentStatus).optional(),
      scheduledAt: z.string().datetime().nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const pageService = getPageService();
    return pageService.updatePage(id, data, ctx.user.id);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.PAGES_DELETE))
  .use(auditLog({ module: "pages", action: "DELETE", entityType: "Page" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const pageService = getPageService();
    const cfService = getCustomFieldService();
    // Clean up custom field values before deletion to prevent orphan data
    await cfService.deleteModelFields("pages", input.id);
    return pageService.deletePage(input.id);
  });

export const revisions = authedProcedure
  .use(requirePermission(Permissions.PAGES_READ))
  .input(z.object({ pageId: z.number().int().positive() }))
  .query(async ({ input }) => {
    const pageService = getPageService();
    return pageService.getRevisions(input.pageId);
  });

export const revision = authedProcedure
  .use(requirePermission(Permissions.PAGES_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const pageService = getPageService();
    return pageService.getRevision(input.id);
  });
