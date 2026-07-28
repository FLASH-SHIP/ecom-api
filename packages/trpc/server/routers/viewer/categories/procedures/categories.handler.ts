import { CategoryTransformer } from "@ecom/features/blog/transformers/CategoryTransformer";
import { getCategoryService } from "@ecom/features/di/containers/BlogService";
import {
  getLanguageRepository,
  getLanguageService,
} from "@ecom/features/di/containers/LanguageService";
import { getTranslationService } from "@ecom/features/di/containers/TranslationService";
import type { FilterFieldConfigMap } from "@ecom/features/shared/utils/buildPrismaWhere";
import { buildPrismaWhere } from "@ecom/features/shared/utils/buildPrismaWhere";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { filtersInputSchema } from "@flash-ship/ecom-trpc/server/shared/filterSchema";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const ContentStatusEnum = z.enum(["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"]);

const CATEGORY_FILTER_FIELDS: FilterFieldConfigMap = {
  id: { prismaField: "id", type: "number" },
  name: { prismaField: "name", type: "string" },
  status: { prismaField: "status", type: "enum" },
  createdAt: { prismaField: "createdAt", type: "date" },
  order: { prismaField: "order", type: "number" },
};

export const list = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_READ))
  .input(
    z
      .object({
        filters: filtersInputSchema,
        search: z.string().max(200).optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(500).default(25),
        sortBy: z.enum(["id", "name", "createdAt", "status", "order"]).optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const categoryService = getCategoryService();
    const { pageSize, filters = [], ...rest } = input ?? {};
    const prismaWhere = buildPrismaWhere(filters, CATEGORY_FILTER_FIELDS);
    const result = await categoryService.listCategories({
      ...rest,
      where: prismaWhere,
      perPage: pageSize,
    });
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
      isFeatured: z.number().int().min(0).max(1).optional(),
      isDefault: z.number().int().min(0).max(1).optional(),
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

    if (result) {
      const languageRepo = getLanguageRepository();
      let langCode = "vi";
      if (ctx.locale) {
        const dbLang = await languageRepo.findByLocale(ctx.locale);
        langCode = dbLang?.code ?? ctx.locale;
      } else {
        const defaultLang = await languageRepo.findDefault();
        if (defaultLang) {
          langCode = defaultLang.code;
        }
      }

      const languageService = getLanguageService();
      await languageService.saveContentLanguage(result.id, "category", langCode);

      const translationService = getTranslationService();
      await translationService.saveTranslation("category", result.id, langCode, {
        name: input.name,
        description: input.description,
      });
    }

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
      isFeatured: z.number().int().min(0).max(1).optional(),
      isDefault: z.number().int().min(0).max(1).optional(),
      status: ContentStatusEnum.optional(),
      parentId: z.number().int().positive().nullable().optional(),
      order: z.number().int().min(0).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const categoryService = getCategoryService();
    const result = await categoryService.updateCategory(id, data);

    if (ctx.locale && result) {
      const languageRepo = getLanguageRepository();
      const dbLang = await languageRepo.findByLocale(ctx.locale);
      const langCode = dbLang?.code ?? ctx.locale;

      const defaultLang = await languageRepo.findDefault();

      if (langCode === defaultLang?.code) {
        const languageService = getLanguageService();
        await languageService.saveContentLanguage(id, "category", langCode);
      } else if (data.name !== undefined || data.description !== undefined) {
        const translationService = getTranslationService();
        const currentCategory = await categoryService.getCategory(id);
        await translationService.saveTranslation("category", id, langCode, {
          name: data.name ?? currentCategory?.name,
          description:
            data.description !== undefined
              ? (data.description ?? undefined)
              : (currentCategory?.description ?? undefined),
        });
      }
    }

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
