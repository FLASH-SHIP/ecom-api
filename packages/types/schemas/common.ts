import { z } from "zod";

/**
 * Shared Zod schemas for common input patterns.
 */

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  perPage: z.number().int().positive().max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const searchSchema = z.object({
  search: z.string().max(200).optional(),
});

export const idSchema = z.object({
  id: z.number().int().positive(),
});

export const slugSchema = z.object({
  slug: z.string().min(1).max(500),
});

export const listQuerySchema = paginationSchema.merge(sortSchema).merge(searchSchema);

export type PaginationInput = z.infer<typeof paginationSchema>;
export type SortInput = z.infer<typeof sortSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type IdInput = z.infer<typeof idSchema>;
export type SlugInput = z.infer<typeof slugSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
