import { getBulkActionService } from "@ecom/features/di/containers/ToolsService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const idsInput = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
});

export const bulkDeletePosts = authedProcedure
  .use(requirePermission(Permissions.POSTS_DELETE))
  .use(auditLog({ module: "bulk", action: "BULK_DELETE", entityType: "Post" }))
  .input(idsInput)
  .mutation(async ({ input }) => {
    const svc = getBulkActionService();
    return svc.bulkDeletePosts(input.ids);
  });

export const bulkStatusPosts = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(auditLog({ module: "bulk", action: "BULK_STATUS", entityType: "Post" }))
  .input(
    z.object({
      ids: z.array(z.number().int().positive()).min(1).max(100),
      status: z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getBulkActionService();
    return svc.bulkStatusPosts(input.ids, input.status);
  });

export const bulkCategoryAssign = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(auditLog({ module: "bulk", action: "BULK_CATEGORY_ASSIGN", entityType: "Post" }))
  .input(
    z.object({
      postIds: z.array(z.number().int().positive()).min(1).max(100),
      categoryIds: z.array(z.number().int().positive()).min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getBulkActionService();
    return svc.bulkCategoryAssign(input.postIds, input.categoryIds);
  });

export const bulkDeleteCategories = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_DELETE))
  .use(auditLog({ module: "bulk", action: "BULK_DELETE", entityType: "Category" }))
  .input(idsInput)
  .mutation(async ({ input }) => {
    const svc = getBulkActionService();
    return svc.bulkDeleteCategories(input.ids);
  });

export const bulkDeleteTags = authedProcedure
  .use(requirePermission(Permissions.TAGS_DELETE))
  .use(auditLog({ module: "bulk", action: "BULK_DELETE", entityType: "Tag" }))
  .input(idsInput)
  .mutation(async ({ input }) => {
    const svc = getBulkActionService();
    return svc.bulkDeleteTags(input.ids);
  });

export const bulkDeletePages = authedProcedure
  .use(requirePermission(Permissions.PAGES_DELETE))
  .use(auditLog({ module: "bulk", action: "BULK_DELETE", entityType: "Page" }))
  .input(idsInput)
  .mutation(async ({ input }) => {
    const svc = getBulkActionService();
    return svc.bulkDeletePages(input.ids);
  });

export const bulkStatusCustomers = authedProcedure
  .use(requirePermission(Permissions.CUSTOMERS_UPDATE))
  .use(auditLog({ module: "bulk", action: "BULK_STATUS", entityType: "Customer" }))
  .input(
    z.object({
      ids: z.array(z.string().min(1)).min(1).max(100),
      status: z.enum(["ACTIVE", "INACTIVE", "BANNED"]),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getBulkActionService();
    return svc.bulkStatusCustomers(input.ids, input.status);
  });
