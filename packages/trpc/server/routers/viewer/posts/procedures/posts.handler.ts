import { PostTransformer } from "@ecom/features/blog/transformers/PostTransformer";
import { getPostService } from "@ecom/features/di/containers/BlogService";
import { getCustomFieldService } from "@ecom/features/di/containers/CustomFieldService";
import { Permissions } from "@ecom/lib/permissions";
import { auditLog } from "@ecom/trpc/server/middleware/auditLog";
import { requirePostPolicy } from "@ecom/trpc/server/middleware/requirePolicy";
import { authedProcedure, requirePermission } from "@ecom/trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const ContentStatusEnum = z.enum(["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"]);

export const list = authedProcedure
  .use(requirePermission(Permissions.POSTS_READ))
  .input(
    z
      .object({
        status: ContentStatusEnum.optional(),
        authorId: z.number().int().positive().optional(),
        categoryId: z.number().int().positive().optional(),
        isFeatured: z.boolean().optional(),
        search: z.string().max(200).optional(),
        includeDeleted: z.boolean().optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(500).default(20),
        sortBy: z.enum(["createdAt", "title", "publishedAt", "views"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    const postService = getPostService();
    const result = await postService.listPosts(input ?? {});
    return new PostTransformer().transformPaginated(result);
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
      featuredImage: z.string().url().optional(),
      bannerImage: z.string().url().optional(),
      isFeatured: z.boolean().optional(),
      allowComments: z.boolean().optional(),
      formatType: z.string().max(50).optional(),
      status: ContentStatusEnum.default("DRAFT"),
      scheduledAt: z.string().datetime().nullable().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      categoryIds: z.array(z.number().int().positive()).optional(),
      tagIds: z.array(z.number().int().positive()).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const postService = getPostService();
    const result = await postService.createPost({
      ...input,
      authorId: ctx.user.id,
    });
    if (!result)
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create post" });
    return new PostTransformer().transformItem(result);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(requirePostPolicy("canUpdate"))
  .use(auditLog({ module: "posts", action: "UPDATE", entityType: "Post" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      title: z.string().min(1).max(500).optional(),
      slug: z.string().max(500).optional(),
      content: z.string().optional(),
      excerpt: z.string().max(1000).optional(),
      featuredImage: z.string().url().nullable().optional(),
      bannerImage: z.string().url().nullable().optional(),
      isFeatured: z.boolean().optional(),
      allowComments: z.boolean().optional(),
      formatType: z.string().max(50).nullable().optional(),
      status: ContentStatusEnum.optional(),
      scheduledAt: z.string().datetime().nullable().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
      categoryIds: z.array(z.number().int().positive()).optional(),
      tagIds: z.array(z.number().int().positive()).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const postService = getPostService();
    const result = await postService.updatePost(id, data);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    return new PostTransformer().transformItem(result);
  });

export const publish = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(requirePostPolicy("canUpdate"))
  .use(auditLog({ module: "posts", action: "PUBLISH", entityType: "Post" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const result = await postService.publishPost(input.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    return new PostTransformer().transformItem(result);
  });

export const archive = authedProcedure
  .use(requirePermission(Permissions.POSTS_UPDATE))
  .use(requirePostPolicy("canUpdate"))
  .use(auditLog({ module: "posts", action: "ARCHIVE", entityType: "Post" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const result = await postService.archivePost(input.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    return new PostTransformer().transformItem(result);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.POSTS_DELETE))
  .use(requirePostPolicy("canDelete"))
  .use(auditLog({ module: "posts", action: "DELETE", entityType: "Post" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const result = await postService.deletePost(input.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    return new PostTransformer().transformItem(result);
  });

export const restore = authedProcedure
  .use(requirePermission(Permissions.POSTS_DELETE))
  .use(requirePostPolicy("canDelete"))
  .use(auditLog({ module: "posts", action: "RESTORE", entityType: "Post" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const postService = getPostService();
    const result = await postService.restorePost(input.id);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    return new PostTransformer().transformItem(result);
  });

export const permanentlyDelete = authedProcedure
  .use(requirePermission(Permissions.POSTS_DELETE))
  .use(requirePostPolicy("canDelete"))
  .use(auditLog({ module: "posts", action: "PERMANENT_DELETE", entityType: "Post" }))
  .input(z.object({ id: z.number().int().positive() }))
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
