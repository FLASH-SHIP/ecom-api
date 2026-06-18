/**
 * Prisma query scope builders — inspired by Laravel Model Scopes.
 *
 * Provides reusable, composable query conditions to avoid
 * repeating common filters across repositories.
 *
 * Usage:
 *   this.prisma.post.findMany({ where: { ...PostScopes.published(), ...PostScopes.featured() } })
 */

export const PostScopes = {
  active: () => ({ deletedAt: null }) as const,

  published: () => ({
    status: "PUBLISHED" as const,
    deletedAt: null,
  }),

  draft: () => ({
    status: "DRAFT" as const,
    deletedAt: null,
  }),

  pending: () => ({
    status: "PENDING" as const,
    deletedAt: null,
  }),

  archived: () => ({
    status: "ARCHIVED" as const,
    deletedAt: null,
  }),

  featured: () => ({
    isFeatured: true,
    deletedAt: null,
  }),

  byAuthor: (authorId: number) => ({
    authorId,
    deletedAt: null,
  }),

  byCategory: (categoryId: number) => ({
    categories: { some: { categoryId } },
    deletedAt: null,
  }),

  search: (query: string) => ({
    OR: [
      { title: { contains: query, mode: "insensitive" as const } },
      { content: { contains: query, mode: "insensitive" as const } },
      { excerpt: { contains: query, mode: "insensitive" as const } },
    ],
  }),

  trashed: () => ({
    deletedAt: { not: null },
  }),

  scheduledForPublish: () => ({
    status: "DRAFT" as const,
    publishedAt: { lte: new Date() },
    deletedAt: null,
  }),
};

export const PageScopes = {
  active: () => ({ deletedAt: null }) as const,

  published: () => ({
    status: "PUBLISHED" as const,
    deletedAt: null,
  }),

  draft: () => ({
    status: "DRAFT" as const,
    deletedAt: null,
  }),

  byTemplate: (template: string) => ({
    template,
    deletedAt: null,
  }),

  search: (query: string) => ({
    OR: [
      { title: { contains: query, mode: "insensitive" as const } },
      { content: { contains: query, mode: "insensitive" as const } },
    ],
  }),

  trashed: () => ({
    deletedAt: { not: null },
  }),

  topLevel: () => ({
    parentId: null,
    deletedAt: null,
  }),
};

export const CommentScopes = {
  approved: () => ({ status: "approved" as const }),
  pending: () => ({ status: "pending" as const }),
  byPost: (postId: number) => ({ postId }),
  topLevel: () => ({ parentId: null }),
};
