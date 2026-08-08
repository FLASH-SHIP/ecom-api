import { prisma } from "@ecom/prisma";
import { createLogger } from "@flash-ship/ecom-lib/logger";
import { getAuditService } from "../../di/containers/AuditService";
import { JobQueue } from "../JobQueue";

export const CLEANUP_QUEUE = "cleanup";
const log = createLogger("CleanupWorker");

/**
 * Register the database cleanup job worker.
 * Call this once during application startup.
 */
export function registerCleanupWorker() {
  JobQueue.register(
    CLEANUP_QUEUE,
    async () => {
      const service = getAuditService();
      const requestDays = process.env.LOG_PURGE_REQUEST_DAYS
        ? Number(process.env.LOG_PURGE_REQUEST_DAYS)
        : 30;
      const auditDays = process.env.LOG_PURGE_AUDIT_DAYS
        ? Number(process.env.LOG_PURGE_AUDIT_DAYS)
        : 90;

      // Purge request logs older than configured days
      const requestLogsPurged = await service.purgeRequestLogs(requestDays);

      // Purge audit logs older than configured days
      const auditLogsPurged = await service.purgeAuditLogs(auditDays);

      // Purge webhook logs older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const webhookLogsPurged = await prisma.webhookLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      // Purge expired API keys
      const expiredKeysPurged = await prisma.apiKey.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      // Purge soft-deleted trash items older than 30 days
      const { purgeTrash } = await import("@ecom/features/scheduler/services/TrashPurge");
      const trashPurged = await purgeTrash().catch(() => ({ purgedPosts: 0, purgedPages: 0 }));

      // Purge expired customer and admin sessions
      const now = new Date();
      const customerSessionsPurged = await prisma.customerSession.deleteMany({
        where: { expires: { lt: now } },
      }).catch(() => ({ count: 0 }));
      const adminSessionsPurged = await prisma.session.deleteMany({
        where: { expires: { lt: now } },
      }).catch(() => ({ count: 0 }));

      log.info("Database cleanup completed successfully", {
        requestLogsPurged: requestLogsPurged.count,
        auditLogsPurged: auditLogsPurged.count,
        webhookLogsPurged: webhookLogsPurged.count,
        expiredKeysPurged: expiredKeysPurged.count,
        trashPurgedPosts: trashPurged.purgedPosts,
        trashPurgedPages: trashPurged.purgedPages,
        customerSessionsPurged: customerSessionsPurged.count,
        adminSessionsPurged: adminSessionsPurged.count,
        requestDaysThreshold: requestDays,
        auditDaysThreshold: auditDays,
        webhookDaysThreshold: 30,
      });
    },
    3, // 3 retries
  );
}

/**
 * Schedule or dispatch a repeatable cleanup job.
 */
export async function queueCleanupJob(): Promise<void> {
  // Retrieve the cleanup queue
  const queues = JobQueue.getQueues();
  const cleanupQueue = queues.find((q) => q.name === CLEANUP_QUEUE);
  if (!cleanupQueue) return;

  const cronPattern = process.env.LOG_PURGE_CRON ?? "0 2 * * *";

  // Add repeatable job to run according to configured cron pattern
  await cleanupQueue.add(
    "daily-cleanup",
    {},
    {
      repeat: {
        pattern: cronPattern,
      },
      jobId: "daily-db-cleanup", // Unique ID to prevent duplicates
    },
  );
}
