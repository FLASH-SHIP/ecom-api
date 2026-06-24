import { CategoryTransformer } from "@ecom/features/blog/transformers/CategoryTransformer";
import { getCategoryService } from "@ecom/features/di/containers/BlogService";
import { Permissions } from "@ecom/lib/permissions";
import { auditLog } from "@ecom/trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@ecom/trpc/server/trpc";
import { z } from "zod";

const ContentStatusEnum = z.enum(["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"]);

export const list = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_READ))
  .input(
    z
      .object({
        status: ContentStatusEnum.optional(),
        parentId: z.number().int().positive().nullable().optional(),
        includeDeleted: z.boolean().optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(500).default(50),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const categoryService = getCategoryService();
    const result = await categoryService.listCategories(input ?? undefined);
    return {
      items: new CategoryTransformer().transformCollection(result.items),
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
    };
  });

export const tree = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_READ))
  .query(async () => {
    const categoryService = getCategoryService();
    return categoryService.getCategoryTree();
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const categoryService = getCategoryService();
    const result = await categoryService.getCategory(input.id);
    return new CategoryTransformer().transformItem(result!);
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_CREATE))
  .use(auditLog({ module: "categories", action: "CREATE", entityType: "Category" }))
  .input(
    z.object({
      name: z.string().min(1).max(200),
      slug: z.string().max(200).optional(),
      description: z.string().max(2000).optional(),
      icon: z.string().max(100).optional(),
      isFeatured: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      status: ContentStatusEnum.default("PUBLISHED"),
      parentId: z.number().int().positive().optional(),
      order: z.number().int().min(0).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const categoryService = getCategoryService();
    const result = await categoryService.createCategory({
      ...input,
      authorId: ctx.user.id,
    });
    return new CategoryTransformer().transformItem(result!);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_UPDATE))
  .use(auditLog({ module: "categories", action: "UPDATE", entityType: "Category" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(200).optional(),
      slug: z.string().max(200).optional(),
      description: z.string().max(2000).nullable().optional(),
      icon: z.string().max(100).nullable().optional(),
      isFeatured: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      status: ContentStatusEnum.optional(),
      parentId: z.number().int().positive().nullable().optional(),
      order: z.number().int().min(0).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const categoryService = getCategoryService();
    const result = await categoryService.updateCategory(id, data);
    return new CategoryTransformer().transformItem(result!);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_DELETE))
  .use(auditLog({ module: "categories", action: "DELETE", entityType: "Category" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const categoryService = getCategoryService();
    const result = await categoryService.deleteCategory(input.id);
    return new CategoryTransformer().transformItem(result!);
  });

export const restore = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_DELETE))
  .use(auditLog({ module: "categories", action: "RESTORE", entityType: "Category" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const categoryService = getCategoryService();
    const result = await categoryService.restoreCategory(input.id);
    return new CategoryTransformer().transformItem(result!);
  });
