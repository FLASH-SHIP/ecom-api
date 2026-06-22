import { prisma } from "@ecom/prisma";

/**
 * Aggregates dashboard overview stats in a single efficient query batch.
 */
export async function getDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    totalPosts,
    publishedPosts,
    draftPosts,
    scheduledPosts,
    totalPages,
    totalCategories,
    totalTags,
    totalComments,
    pendingComments,
    totalContacts,
    newContacts,
    totalCustomers,
    totalMedia,
    totalMediaSize,
    recentPosts,
    popularPosts,
  ] = await Promise.all([
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.post.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    prisma.post.count({ where: { status: "DRAFT", deletedAt: null } }),
    prisma.post.count({ where: { scheduledAt: { not: null }, status: "DRAFT", deletedAt: null } }),
    prisma.page.count({ where: { deletedAt: null } }),
    prisma.category.count(),
    prisma.tag.count(),
    prisma.comment.count(),
    prisma.comment.count({ where: { status: "PENDING" } }),
    prisma.contactSubmission.count(),
    prisma.contactSubmission.count({ where: { status: "NEW" } }),
    prisma.customer.count(),
    prisma.mediaFile.count(),
    prisma.mediaFile.aggregate({ _sum: { size: true } }),
    prisma.post.findMany({
      where: { deletedAt: null },
      select: { id: true, title: true, slug: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      select: { id: true, title: true, slug: true, views: true },
      orderBy: { views: "desc" },
      take: 5,
    }),
  ]);

  return {
    content: {
      totalPosts,
      publishedPosts,
      draftPosts,
      scheduledPosts,
      totalPages,
      totalCategories,
      totalTags,
    },
    engagement: {
      totalComments,
      pendingComments,
      totalContacts,
      newContacts,
    },
    people: {
      totalCustomers,
    },
    media: {
      totalMedia,
      totalSize: totalMediaSize._sum.size ?? 0,
    },
    recentPosts,
    popularPosts,
  };
}
