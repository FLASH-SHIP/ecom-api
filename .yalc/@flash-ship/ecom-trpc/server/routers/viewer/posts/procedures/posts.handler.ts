import { PostTransformer } from "@ecom/features/blog/transformers/PostTransformer";
import { getPostService } from "@ecom/features/di/containers/BlogService";
import { getCustomFieldService } from "@ecom/features/di/containers/CustomFieldService";
import {
  getLanguageRepository,
  getLanguageService,
} from "@ecom/features/di/containers/LanguageService";
import { getTranslationService } from "@ecom/features/di/containers/TranslationService";
import type { FilterFieldConfigMap } from "@ecom/features/shared/utils/buildPrismaWhere";
import { buildPrismaWhere } from "@ecom/features/shared/utils/buildPrismaWhere";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { requirePostPolicy } from "@flash-ship/ecom-trpc/server/middleware/requirePolicy";
import { filtersInputSchema } from "@flash-ship/ecom-trpc/server/shared/filterSchema";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const ContentStatusEnum = z.enum(["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"]);

const POST_FILTER_FIELDS: FilterFieldConfigMap = {
  id: { prismaField: "id", type: "number" },
  title: { prismaField: "title", type: "string" },
  status: { prismaField: "status", type: "enum" },
  createdAt: { prismaField: "createdAt", type: "date" },
};

export const list = authedProcedure
  .use(requirePermission(Permissions.POSTS_READ))
  .input(
    z
      .object({
        filters: filtersInputSchema.optional(),
        status: ContentStatusEnum.optional(),
        authorId: z.string().min(1).optional(),
        categoryId: z.number().int().positive().optional(),
        isFeatured: z.boolean().optional(),
        search: z.string().max(200).optional(),
        includeDeleted: z.boolean().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(500).default(20),
        perPage: z.number().int().positive().max(500).optional(),
        sortBy: z
          .enum(["id", "title", "status", "createdAt", "publishedAt", "views"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const postService = getPostService();
    const { pageSize, perPage, filters = [], sortBy, sortOrder, sortDir, ...rest } = input ?? {};
    const prismaWhere = buildPrismaWhere(filters, POST_FILTER_FIELDS);
    return postService.listPosts({
      ...rest,
      sortBy: sortBy,
      sortOrder: sortOrder ?? sortDir ?? "desc",
      where: prismaWhere,
      perPage: pageSize ?? perPage ?? 20,
    });
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.POSTS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const postService = getPostService();
    const result = await postService.getPost(input.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    return new PostTransformer().transformItem(result);
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.POSTS_CREATE))
  .use(auditLog({ module: "posts", action: "CREATE", entityType: "Post" }))
  .input(
    z.object({
      title: z.string().min(1).max(500),
      slug: z.string().max(500).optional(),
      content: z.string().optional(),
      excerpt: z.string().max(1000).optional(),
      featuredImage: z.string().optional(),
      bannerImage: z.string().optional(),
      isFeatured: z.boolean().optional(),
      allowComments: z.boolean().optional(),
      formatType: z.string().max(50).optional(),
      externalSource: z.string().optional(),
      sponsoredBy: z.string().optional(),
      status: ContentStatusEnum.default("DRAFT"),
      scheduledAt: z.string().datetime().nullable().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      categoryIds: z.array(z.number().int().positive()).optional(),
      tagIds: z.array(z.number().int().positive()).optional(),
      authorId: z.string().min(1).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const postService = getPostService();
    const result = await postService.createPost({
      ...input,
      authorId: input.authorId ?? ctx.user.id,
    });
    if (!result)
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create post" });

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
    await languageService.saveContentLanguage(result.id, "post", langCode);

    const translationService = getTranslationService();
    await translationService.saveTranslation("post", result.id, langCode, {
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
    });

    return new PostTransformer().transformItem(result);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(auditLog({ module: "posts", action: "UPDATE", entityType: "Post" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      title: z.string().min(1).max(500).optional(),
      slug: z.string().max(500).optional(),
      content: z.string().optional(),
      excerpt: z.string().max(1000).optional(),
      featuredImage: z.string().nullable().optional(),
      bannerImage: z.string().nullable().optional(),
      isFeatured: z.boolean().optional(),
      allowComments: z.boolean().optional(),
      formatType: z.string().max(50).nullable().optional(),
      externalSource: z.string().nullable().optional(),
      sponsoredBy: z.string().nullable().optional(),
      status: ContentStatusEnum.optional(),
      scheduledAt: z.string().datetime().nullable().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      categoryIds: z.array(z.number().int().positive()).optional(),
      tagIds: z.array(z.number().int().positive()).optional(),
      authorId: z.string().min(1).optional(),
    }),
  )
  .use(requirePostPolicy("canUpdate"))
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: syncs content language and translations during update
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const postService = getPostService();
    const result = await postService.updatePost(id, data);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });

    if (ctx.locale) {
      const languageRepo = getLanguageRepository();
      const dbLang = await languageRepo.findByLocale(ctx.locale);
      const langCode = dbLang?.code ?? ctx.locale;

      const defaultLang = await languageRepo.findDefault();

      if (langCode === defaultLang?.code) {
        const languageService = getLanguageService();
        await languageService.saveContentLanguage(id, "post", langCode);
      } else if (
        data.title !== undefined ||
        data.slug !== undefined ||
        data.excerpt !== undefined ||
        data.content !== undefined
      ) {
        const translationService = getTranslationService();
        const currentPost = await postService.getPost(id);
        await translationService.saveTranslation("post", id, langCode, {
          title: data.title ?? currentPost.title,
          slug: data.slug ?? currentPost.slug,
          excerpt:
            data.excerpt !== undefined
              ? (data.excerpt ?? undefined)
              : (currentPost.excerpt ?? undefined),
          content: data.content !== undefined ? data.content : (currentPost.content ?? undefined),
        });
      }
    }

    return new PostTransformer().transformItem(result);
  });

export const publish = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(auditLog({ module: "posts", action: "PUBLISH", entityType: "Post" }))
  .input(z.object({ id: z.number().int().positive() }))
  .use(requirePostPolicy("canUpdate"))
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const result = await postService.publishPost(input.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    return new PostTransformer().transformItem(result);
  });

export const archive = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(auditLog({ module: "posts", action: "ARCHIVE", entityType: "Post" }))
  .input(z.object({ id: z.number().int().positive() }))
  .use(requirePostPolicy("canUpdate"))
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const result = await postService.archivePost(input.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    return new PostTransformer().transformItem(result);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.POSTS_DELETE))
  .use(auditLog({ module: "posts", action: "DELETE", entityType: "Post" }))
  .input(z.object({ id: z.number().int().positive() }))
  .use(requirePostPolicy("canDelete"))
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const result = await postService.deletePost(input.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    return new PostTransformer().transformItem(result);
  });

export const restore = authedProcedure
  .use(requirePermission(Permissions.POSTS_DELETE))
  .use(auditLog({ module: "posts", action: "RESTORE", entityType: "Post" }))
  .input(z.object({ id: z.number().int().positive() }))
  .use(requirePostPolicy("canDelete"))
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const result = await postService.restorePost(input.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    return new PostTransformer().transformItem(result);
  });

export const permanentlyDelete = authedProcedure
  .use(requirePermission(Permissions.POSTS_DELETE))
  .use(auditLog({ module: "posts", action: "PERMANENT_DELETE", entityType: "Post" }))
  .input(z.object({ id: z.number().int().positive() }))
  .use(requirePostPolicy("canDelete"))
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const cfService = getCustomFieldService();
    // Clean up custom field values before permanent deletion to prevent orphan data
    await cfService.deleteModelFields("posts", input.id);
    return postService.permanentlyDeletePost(input.id);
  });

// --- Bulk Actions ---

const bulkIdsInput = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
});

export const bulkDelete = authedProcedure
  .use(requirePermission(Permissions.POSTS_DELETE))
  .use(auditLog({ module: "posts", action: "BULK_DELETE", entityType: "Post" }))
  .input(bulkIdsInput)
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const results = await Promise.allSettled(input.ids.map((id) => postService.deletePost(id)));
    return {
      success: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    };
  });

export const bulkPublish = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(auditLog({ module: "posts", action: "BULK_PUBLISH", entityType: "Post" }))
  .input(bulkIdsInput)
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const results = await Promise.allSettled(input.ids.map((id) => postService.publishPost(id)));
    return {
      success: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    };
  });

export const bulkArchive = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(auditLog({ module: "posts", action: "BULK_ARCHIVE", entityType: "Post" }))
  .input(bulkIdsInput)
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const results = await Promise.allSettled(input.ids.map((id) => postService.archivePost(id)));
    return {
      success: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    };
  });

export const bulkRestore = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(auditLog({ module: "posts", action: "BULK_RESTORE", entityType: "Post" }))
  .input(bulkIdsInput)
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const results = await Promise.allSettled(input.ids.map((id) => postService.restorePost(id)));
    return {
      success: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    };
  });

export const clone = authedProcedure
  .use(requirePermission(Permissions.POSTS_CREATE))
  .use(auditLog({ module: "posts", action: "CLONE", entityType: "Post" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    const postService = getPostService();
    const result = await postService.clonePost(input.id, ctx.user.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    return new PostTransformer().transformItem(result);
  });
