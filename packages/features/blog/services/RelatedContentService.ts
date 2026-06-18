import { prisma } from "@ecom/prisma";

/**
 * Finds posts related to a given post, based on shared categories and tags.
 * Uses a scoring algorithm: each shared category = 2 points, each shared tag = 1 point.
 */
export async function getRelatedPosts(postId: number, limit = 5) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      categories: { select: { categoryId: true } },
      tags: { select: { tagId: true } },
    },
  });

  if (!post) return [];

  const categoryIds = post.categories.map((c) => c.categoryId);
  const tagIds = post.tags.map((t) => t.tagId);

  if (categoryIds.length === 0 && tagIds.length === 0) return [];

  // Find candidates sharing categories or tags (exclude self, deleted, non-published)
  const candidates = await prisma.post.findMany({
    where: {
      id: { not: postId },
      status: "PUBLISHED",
      deletedAt: null,
      OR: [
        ...(categoryIds.length > 0
          ? [{ categories: { some: { categoryId: { in: categoryIds } } } }]
          : []),
        ...(tagIds.length > 0 ? [{ tags: { some: { tagId: { in: tagIds } } } }] : []),
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featuredImage: true,
      publishedAt: true,
      categories: { select: { categoryId: true } },
      tags: { select: { tagId: true } },
    },
    take: limit * 3, // Fetch extra for scoring
  });

  // Score candidates by overlap
  const scored = candidates.map((candidate) => {
    const sharedCategories = candidate.categories.filter((c) =>
      categoryIds.includes(c.categoryId),
    ).length;
    const sharedTags = candidate.tags.filter((t) => tagIds.includes(t.tagId)).length;
    const score = sharedCategories * 2 + sharedTags;

    return {
      id: candidate.id,
      title: candidate.title,
      slug: candidate.slug,
      excerpt: candidate.excerpt,
      featuredImage: candidate.featuredImage,
      publishedAt: candidate.publishedAt,
      score,
    };
  });

  // Sort by score desc, take top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
