import { createLogger } from "@ecom/lib/logger";
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

      log.info("Database cleanup completed successfully", {
        requestLogsPurged: requestLogsPurged.count,
        auditLogsPurged: auditLogsPurged.count,
        requestDaysThreshold: requestDays,
        auditDaysThreshold: auditDays,
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
