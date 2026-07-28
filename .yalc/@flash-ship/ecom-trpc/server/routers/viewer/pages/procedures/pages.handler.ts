import { getCustomFieldService } from "@ecom/features/di/containers/CustomFieldService";
import {
  getLanguageRepository,
  getLanguageService,
} from "@ecom/features/di/containers/LanguageService";
import { getPageService } from "@ecom/features/di/containers/PageService";
import { getTranslationService } from "@ecom/features/di/containers/TranslationService";
import type { FilterFieldConfigMap } from "@ecom/features/shared/utils/buildPrismaWhere";
import { buildPrismaWhere } from "@ecom/features/shared/utils/buildPrismaWhere";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { ContentStatus } from "@ecom/prisma";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { filtersInputSchema } from "@flash-ship/ecom-trpc/server/shared/filterSchema";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const PAGE_FILTER_FIELDS: FilterFieldConfigMap = {
  id: { prismaField: "id", type: "number" },
  title: { prismaField: "title", type: "string" },
  status: { prismaField: "status", type: "enum" },
  createdAt: { prismaField: "createdAt", type: "date" },
};

export const list = authedProcedure
  .use(requirePermission(Permissions.PAGES_READ))
  .input(
    z
      .object({
        filters: filtersInputSchema.optional(),
        search: z.string().max(200).optional(),
        status: z.nativeEnum(ContentStatus).optional(),
        parentId: z.number().int().nullable().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(500).default(20),
        perPage: z.number().int().positive().max(500).optional(),
        sortBy: z.enum(["id", "title", "status", "createdAt", "order"]).optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const pageService = getPageService();
    const { pageSize, perPage, filters = [], sortBy, sortOrder, sortDir, ...rest } = input ?? {};
    const prismaWhere = buildPrismaWhere(filters, PAGE_FILTER_FIELDS);
    return pageService.listPages({
      ...rest,
      sortBy,
      sortDir: sortOrder ?? sortDir ?? undefined,
      where: prismaWhere,
      perPage: pageSize ?? perPage ?? 20,
    });
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
      bannerImage: z.string().optional(),
      heroBanner: z.string().optional(),
      layout: z.string().optional(),
      hideTitle: z.boolean().optional(),
      hideBreadcrumb: z.boolean().optional(),
      hideSidebar: z.boolean().optional(),
      hideFooter: z.boolean().optional(),
      gallery: z.array(z.string()).optional(),
      subtitle: z.string().optional(),
      ctaText: z.string().optional(),
      ctaLink: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const pageService = getPageService();
    const result = await pageService.createPage({ ...input, authorId: ctx.user.id });
    if (!result)
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create page" });

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
    await languageService.saveContentLanguage(result.id, "page", langCode);

    const translationService = getTranslationService();
    await translationService.saveTranslation("page", result.id, langCode, {
      title: input.title,
      slug: input.slug,
      content: input.content,
      excerpt: input.excerpt,
      subtitle: input.subtitle,
      ctaText: input.ctaText,
      ctaLink: input.ctaLink,
    });

    return result;
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
      bannerImage: z.string().optional(),
      heroBanner: z.string().optional(),
      layout: z.string().optional(),
      hideTitle: z.boolean().optional(),
      hideBreadcrumb: z.boolean().optional(),
      hideSidebar: z.boolean().optional(),
      hideFooter: z.boolean().optional(),
      gallery: z.array(z.string()).optional(),
      subtitle: z.string().optional(),
      ctaText: z.string().optional(),
      ctaLink: z.string().optional(),
    }),
  )
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: syncs content language and translations during update
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const pageService = getPageService();
    const result = await pageService.updatePage(id, data, ctx.user.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });

    if (ctx.locale) {
      const languageRepo = getLanguageRepository();
      const dbLang = await languageRepo.findByLocale(ctx.locale);
      const langCode = dbLang?.code ?? ctx.locale;

      const defaultLang = await languageRepo.findDefault();

      if (langCode === defaultLang?.code) {
        const languageService = getLanguageService();
        await languageService.saveContentLanguage(id, "page", langCode);
      } else if (
        data.title !== undefined ||
        data.slug !== undefined ||
        data.content !== undefined ||
        data.excerpt !== undefined ||
        data.subtitle !== undefined ||
        data.ctaText !== undefined ||
        data.ctaLink !== undefined
      ) {
        const translationService = getTranslationService();
        const currentPage = await pageService.getPage(id);
        await translationService.saveTranslation("page", id, langCode, {
          title: data.title ?? currentPage.title,
          slug: data.slug ?? currentPage.slug,
          content: data.content !== undefined ? data.content : (currentPage.content ?? undefined),
          excerpt: data.excerpt !== undefined ? data.excerpt : (currentPage.excerpt ?? undefined),
          subtitle:
            data.subtitle !== undefined ? data.subtitle : (currentPage.subtitle ?? undefined),
          ctaText: data.ctaText !== undefined ? data.ctaText : (currentPage.ctaText ?? undefined),
          ctaLink: data.ctaLink !== undefined ? data.ctaLink : (currentPage.ctaLink ?? undefined),
        });
      }
    }

    return result;
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
