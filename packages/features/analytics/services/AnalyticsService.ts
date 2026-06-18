import { prisma } from "@ecom/prisma";

/**
 * Content analytics aggregations.
 * Provides trend data, popular content, and publishing stats.
 */
export class AnalyticsService {
  /**
   * Get publishing trends — posts published per day/week/month.
   */
  async getPublishingTrends(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const posts = await prisma.post.findMany({
      where: {
        publishedAt: { gte: since },
        status: "PUBLISHED",
        deletedAt: null,
      },
      select: { publishedAt: true },
      orderBy: { publishedAt: "asc" },
    });

    // Group by date
    const dateMap = new Map<string, number>();
    for (const post of posts) {
      if (!post.publishedAt) continue;
      const dateKey = post.publishedAt.toISOString().slice(0, 10);
      dateMap.set(dateKey, (dateMap.get(dateKey) ?? 0) + 1);
    }

    return Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));
  }

  /**
   * Get top performing posts by views.
   */
  async getPopularContent(limit = 10) {
    return prisma.post.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        publishedAt: true,
      },
      orderBy: { views: "desc" },
      take: limit,
    });
  }

  /**
   * Get content status breakdown.
   */
  async getStatusBreakdown() {
    const result = await prisma.post.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { id: true },
    });

    return result.map((r) => ({
      status: r.status,
      count: r._count.id,
    }));
  }

  /**
   * Get author productivity — posts per author.
   */
  async getAuthorStats(limit = 10) {
    const result = await prisma.post.groupBy({
      by: ["authorId"],
      where: { deletedAt: null },
      _count: { id: true },
      _sum: { views: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    // Enrich with author names
    const authorIds = result.map((r) => r.authorId);
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true, email: true },
    });

    const authorMap = new Map(authors.map((a) => [a.id, a]));

    return result.map((r) => ({
      authorId: r.authorId,
      name: authorMap.get(r.authorId)?.name ?? "Unknown",
      email: authorMap.get(r.authorId)?.email ?? "",
      postCount: r._count.id,
      totalViews: r._sum.views ?? 0,
    }));
  }

  /**
   * Get category popularity — posts per category.
   */
  async getCategoryStats() {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { posts: true } },
      },
      orderBy: { posts: { _count: "desc" } },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      postCount: c._count.posts,
    }));
  }

  /**
   * Get engagement overview — comments, contacts, members over time.
   */
  async getEngagementOverview(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [comments, contacts, members] = await Promise.all([
      prisma.comment.count({ where: { createdAt: { gte: since } } }),
      prisma.contactSubmission.count({ where: { createdAt: { gte: since } } }),
      prisma.member.count({ where: { createdAt: { gte: since } } }),
    ]);

    return {
      period: `${days} days`,
      newComments: comments,
      newContacts: contacts,
      newMembers: members,
    };
  }
}

let instance: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
  if (!instance) {
    instance = new AnalyticsService();
  }
  return instance;
}
