import {
  getCategoryService,
  getPostService,
  getTagService,
} from "@ecom/features/di/containers/BlogService";
import { getCommentService } from "@ecom/features/di/containers/CommentService";
import {
  findPostByTranslatedSlug,
  overlayCategoryTranslations,
  overlayPostTranslation,
  overlayPostTranslations,
  overlayTagTranslations,
} from "@ecom/features/translation/services/TranslationOverlay";
import { rateLimiters } from "@flash-ship/ecom-trpc/server/middleware/rateLimit";
import { publicProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const listPosts = publicProcedure
  .use(rateLimiters.publicApi)
  .input(
    z
      .object({
        categoryId: z.number().int().positive().optional(),
        isFeatured: z.boolean().optional(),
        search: z.string().max(200).optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(50).default(12),
      })
      .optional(),
  )
  .query(async ({ input, ctx }) => {
    const postService = getPostService();
    const result = await postService.listPosts({
      ...(input ?? {}),
      status: "PUBLISHED",
    });

    if (ctx.locale && result.data) {
      const translatedRows = await overlayPostTranslations(result.data, ctx.locale);
      return { ...result, data: translatedRows };
    }

    return result;
  });

export const getBySlug = publicProcedure
  .use(rateLimiters.publicApi)
  .input(z.object({ slug: z.string().min(1).max(500) }))
  .query(async ({ input, ctx }) => {
    const postService = getPostService();

    // Try translated slug resolution first
    if (ctx.locale) {
      const resolved = await findPostByTranslatedSlug(input.slug, ctx.locale);
      if (resolved) {
        const post = await postService.getPost(resolved.postId);
        const translated = await overlayPostTranslation(post, ctx.locale);
        postService.recordView(post.id).catch(() => {});
        return translated;
      }
    }

    // Fallback: standard slug lookup
    const post = await postService.getPostBySlug(input.slug);
    const translated = await overlayPostTranslation(post, ctx.locale);

    postService.recordView(post.id).catch(() => {});

    return translated;
  });

export const categories = publicProcedure.use(rateLimiters.publicApi).query(async ({ ctx }) => {
  const categoryService = getCategoryService();
  const tree = await categoryService.getCategoryTree();
  return overlayCategoryTranslations(tree, ctx.locale);
});

export const tags = publicProcedure
  .use(rateLimiters.publicApi)
  .input(
    z
      .object({
        search: z.string().max(200).optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(100).default(50),
      })
      .optional(),
  )
  .query(async ({ input, ctx }) => {
    const tagService = getTagService();
    const result = await tagService.listTags(input ?? undefined);

    if (ctx.locale && result.rows) {
      const translatedRows = await overlayTagTranslations(result.rows, ctx.locale);
      return { ...result, rows: translatedRows };
    }

    return result;
  });

// ─── Public Comment Endpoints ───────────────────────

export const listComments = publicProcedure
  .use(rateLimiters.publicApi)
  .input(
    z.object({
      postId: z.number().int().positive(),
      page: z.number().int().positive().default(1),
      perPage: z.number().int().positive().max(50).default(20),
    }),
  )
  .query(async ({ input }) => {
    const svc = getCommentService();
    return svc.listComments({
      postId: input.postId,
      status: "approved",
      page: input.page,
      perPage: input.perPage,
    });
  });

export const submitComment = publicProcedure
  .use(rateLimiters.publicApi)
  .input(
    z.object({
      postId: z.number().int().positive(),
      parentId: z.number().int().positive().optional(),
      authorName: z.string().min(1).max(100),
      authorEmail: z.string().email().max(255),
      content: z.string().min(1).max(5000),
      // Honeypot field — should always be empty if submitted by a human
      website: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    // Honeypot spam check: bots fill in hidden "website" field
    if (input.website && input.website.length > 0) {
      // Silently accept but discard — don't reveal the trap
      return { success: true, message: "Comment submitted for moderation." };
    }

    const svc = getCommentService();
    await svc.createComment({
      postId: input.postId,
      parentId: input.parentId,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      content: input.content,
    });

    return { success: true, message: "Comment submitted for moderation." };
  });

// ─── Related Posts ───────────────────────

export const relatedPosts = publicProcedure
  .use(rateLimiters.publicApi)
  .input(
    z.object({
      postId: z.number().int().positive(),
      limit: z.number().int().positive().max(10).default(5),
    }),
  )
  .query(async ({ input, ctx }) => {
    const { getRelatedPosts } = await import("@ecom/features/blog/services/RelatedContentService");
    const posts = await getRelatedPosts(input.postId, input.limit);
    return overlayPostTranslations(posts, ctx.locale);
  });

// ─── Full-text Search ───────────────────────

export const search = publicProcedure
  .use(rateLimiters.publicApi)
  .input(
    z.object({
      query: z.string().min(1).max(200),
      page: z.number().int().positive().default(1),
      perPage: z.number().int().positive().max(30).default(10),
    }),
  )
  .query(async ({ input, ctx }) => {
    const postService = getPostService();
    const result = await postService.listPosts({
      search: input.query,
      status: "PUBLISHED",
      page: input.page,
      perPage: input.perPage,
    });

    if (ctx.locale && result.data) {
      const translatedRows = await overlayPostTranslations(result.data, ctx.locale);
      return { ...result, data: translatedRows };
    }

    return result;
  });
