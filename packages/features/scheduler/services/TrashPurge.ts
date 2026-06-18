import { createLogger } from "@ecom/lib/logger";
import { prisma } from "@ecom/prisma";

const log = createLogger("TrashPurge");

const PURGE_DAYS = 30;

/**
 * Permanently deletes soft-deleted posts and pages older than PURGE_DAYS.
 * Designed to run as a scheduled task (e.g., daily at 2 AM).
 */
export async function purgeTrash(): Promise<{
  purgedPosts: number;
  purgedPages: number;
}> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PURGE_DAYS);

  const postResult = await prisma.post.deleteMany({
    where: {
      deletedAt: { lte: cutoff },
    },
  });

  const pageResult = await prisma.page.deleteMany({
    where: {
      deletedAt: { lte: cutoff },
    },
  });

  if (postResult.count > 0 || pageResult.count > 0) {
    log.info("Purged old trash items", {
      posts: postResult.count,
      pages: pageResult.count,
      olderThan: `${PURGE_DAYS} days`,
    });
  }

  return {
    purgedPosts: postResult.count,
    purgedPages: pageResult.count,
  };
}
