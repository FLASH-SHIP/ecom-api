import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("ContentScheduler");

interface ISchedulerDeps {
  prisma: {
    post: {
      findMany: (args: Record<string, unknown>) => Promise<{ id: number; title: string }[]>;
      updateMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
    };
  };
}

/**
 * Content Scheduler — handles automated publishing and expiry.
 *
 * - Publishes posts with scheduledAt <= now and status DRAFT
 * - Archives posts with expiresAt <= now and status PUBLISHED
 *
 * Designed to run as a cron job (e.g., every minute).
 */
export class ContentScheduler {
  private deps: ISchedulerDeps;
  constructor(deps: ISchedulerDeps) {
    this.deps = deps;
  }

  /**
   * Publish posts that are scheduled for now or earlier.
   */
  async publishScheduledPosts(): Promise<number> {
    const now = new Date();

    const posts = await this.deps.prisma.post.findMany({
      where: {
        status: "DRAFT",
        scheduledAt: { lte: now },
        deletedAt: null,
      },
      select: { id: true, title: true },
    });

    if (posts.length === 0) return 0;

    const result = await this.deps.prisma.post.updateMany({
      where: {
        id: { in: posts.map((p) => p.id) },
      },
      data: {
        status: "PUBLISHED",
        publishedAt: now,
        scheduledAt: null,
      },
    });

    log.info(`Published ${result.count} scheduled posts`, {
      postIds: posts.map((p) => p.id),
    });

    return result.count;
  }

  /**
   * Archive posts that have expired.
   */
  async archiveExpiredPosts(): Promise<number> {
    const now = new Date();

    const posts = await this.deps.prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        expiresAt: { lte: now },
        deletedAt: null,
      },
      select: { id: true, title: true },
    });

    if (posts.length === 0) return 0;

    const result = await this.deps.prisma.post.updateMany({
      where: {
        id: { in: posts.map((p) => p.id) },
      },
      data: {
        status: "ARCHIVED",
      },
    });

    log.info(`Archived ${result.count} expired posts`, {
      postIds: posts.map((p) => p.id),
    });

    return result.count;
  }

  /**
   * Run both scheduled publish and expiry checks.
   * Call this from a cron job.
   */
  async tick(): Promise<{ published: number; archived: number }> {
    const published = await this.publishScheduledPosts();
    const archived = await this.archiveExpiredPosts();
    return { published, archived };
  }
}
