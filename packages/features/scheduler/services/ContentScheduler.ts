import { createLogger } from "@ecom/lib/logger";
import { prisma } from "@ecom/prisma";

const log = createLogger("ContentScheduler");

/**
 * Publishes posts and pages whose scheduledAt time has passed.
 * Designed to run as a scheduled task (e.g., every minute via TaskScheduler).
 */
export async function publishScheduledContent(): Promise<{
  publishedPosts: number;
  publishedPages: number;
}> {
  const now = new Date();

  const postResult = await prisma.post.updateMany({
    where: {
      status: "DRAFT",
      scheduledAt: { lte: now },
      deletedAt: null,
    },
    data: {
      status: "PUBLISHED",
      publishedAt: now,
      scheduledAt: null,
    },
  });

  const pageResult = await prisma.page.updateMany({
    where: {
      status: "DRAFT",
      scheduledAt: { lte: now },
      deletedAt: null,
    },
    data: {
      status: "PUBLISHED",
      publishedAt: now,
      scheduledAt: null,
    },
  });

  if (postResult.count > 0 || pageResult.count > 0) {
    log.info("Published scheduled content", {
      posts: postResult.count,
      pages: pageResult.count,
    });
  }

  return {
    publishedPosts: postResult.count,
    publishedPages: pageResult.count,
  };
}
