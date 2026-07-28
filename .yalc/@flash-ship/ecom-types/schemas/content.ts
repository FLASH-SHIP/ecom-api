import { z } from "zod";

/**
 * Shared Zod schemas for Post validation.
 * Inspired by Laravel Form Requests — centralized, reusable validation.
 */

export const contentStatusSchema = z.enum([
  "DRAFT",
  "PENDING",
  "REVIEW",
  "REJECTED",
  "PUBLISHED",
  "ARCHIVED",
]);

export const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  slug: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  excerpt: z.string().max(1000).optional(),
  featuredImage: z.string().max(1000).optional(),
  bannerImage: z.string().max(1000).optional(),
  status: contentStatusSchema.default("DRAFT"),
  isFeatured: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  formatType: z.string().max(50).optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
  publishedAt: z.string().datetime().optional(),
});

export const updatePostSchema = createPostSchema.partial().extend({
  id: z.number().int().positive(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const createPageSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  slug: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  excerpt: z.string().max(1000).optional(),
  featuredImage: z.string().max(1000).optional(),
  status: contentStatusSchema.default("DRAFT"),
  template: z.string().max(100).optional(),
  order: z.number().int().min(0).default(0),
  parentId: z.number().int().positive().optional(),
});

export const updatePageSchema = createPageSchema.partial().extend({
  id: z.number().int().positive(),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
