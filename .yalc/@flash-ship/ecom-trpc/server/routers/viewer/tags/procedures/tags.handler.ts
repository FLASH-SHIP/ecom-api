import { getTagService } from "@ecom/features/di/containers/BlogService";
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

const contentStatusSchema = z.enum(["DRAFT", "PENDING", "PUBLISHED"]);

const TAG_FILTER_FIELDS: FilterFieldConfigMap = {
  id: { prismaField: "id", type: "number" },
  name: { prismaField: "name", type: "string" },
  status: { prismaField: "status", type: "enum" },
  createdAt: { prismaField: "createdAt", type: "date" },
};

export const list = authedProcedure
  .use(requirePermission(Permissions.TAGS_READ))
  .input(
    z
      .object({
        filters: filtersInputSchema,
        search: z.string().max(200).optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(500).default(25),
        sortBy: z.enum(["id", "name", "createdAt", "status"]).optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const tagService = getTagService();
    const { pageSize, filters = [], ...rest } = input ?? {};
    const prismaWhere = buildPrismaWhere(filters, TAG_FILTER_FIELDS);
    return tagService.listTags({ ...rest, where: prismaWhere, perPage: pageSize });
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.TAGS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const tagService = getTagService();
    return tagService.getTag(input.id);
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.TAGS_CREATE))
  .use(auditLog({ module: "tags", action: "CREATE", entityType: "Tag" }))
  .input(
    z.object({
      name: z.string().min(1).max(120),
      slug: z.string().max(120).optional(),
      description: z.string().optional(),
      status: contentStatusSchema.default("PUBLISHED"),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const tagService = getTagService();
    const tag = await tagService.createTag({
      ...input,
      authorId: ctx.user.id,
      authorType: "User",
    });

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
    await languageService.saveContentLanguage(tag.id, "tag", langCode);

    const translationService = getTranslationService();
    await translationService.saveTranslation("tag", tag.id, langCode, {
      name: input.name,
      description: input.description,
    });

    return tag;
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.TAGS_UPDATE))
  .use(auditLog({ module: "tags", action: "UPDATE", entityType: "Tag" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(120).optional(),
      slug: z.string().max(120).optional(),
      description: z.string().optional(),
      status: contentStatusSchema.optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { id, ...data } = input;
    const tagService = getTagService();
    const tag = await tagService.updateTag(id, data);

    if (ctx.locale) {
      const languageRepo = getLanguageRepository();
      const dbLang = await languageRepo.findByLocale(ctx.locale);
      const langCode = dbLang?.code ?? ctx.locale;

      const defaultLang = await languageRepo.findDefault();

      if (langCode === defaultLang?.code) {
        const languageService = getLanguageService();
        await languageService.saveContentLanguage(id, "tag", langCode);
      } else if (data.name !== undefined || data.description !== undefined) {
        const translationService = getTranslationService();
        const currentTag = await tagService.getTag(id);
        await translationService.saveTranslation("tag", id, langCode, {
          name: data.name ?? currentTag.name,
          description:
            data.description !== undefined
              ? data.description
              : (currentTag.description ?? undefined),
        });
      }
    }

    return tag;
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.TAGS_DELETE))
  .use(auditLog({ module: "tags", action: "DELETE", entityType: "Tag" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const tagService = getTagService();
    return tagService.deleteTag(input.id);
  });

export const restore = authedProcedure
  .use(requirePermission(Permissions.TAGS_DELETE))
  .use(auditLog({ module: "tags", action: "RESTORE", entityType: "Tag" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const tagService = getTagService();
    return tagService.restoreTag(input.id);
  });

export const permanentlyDelete = authedProcedure
  .use(requirePermission(Permissions.TAGS_DELETE))
  .use(auditLog({ module: "tags", action: "PERMANENT_DELETE", entityType: "Tag" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const tagService = getTagService();
    return tagService.permanentlyDeleteTag(input.id);
  });
