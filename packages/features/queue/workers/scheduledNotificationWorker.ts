import { createLogger } from "@flash-ship/ecom-lib/logger";
import { getScheduledNotificationService } from "../../di/containers/NotificationService";
import { JobQueue } from "../JobQueue";

export const SCHEDULED_NOTIFICATIONS_QUEUE = "scheduled-notifications";
const log = createLogger("ScheduledNotificationWorker");

/**
 * Register the scheduled notifications job worker.
 * Call this once during application startup.
 */
export function registerScheduledNotificationWorker() {
  JobQueue.register(
    SCHEDULED_NOTIFICATIONS_QUEUE,
    async () => {
      const service = getScheduledNotificationService();
      await service.dispatchDueNotifications();
    },
    3, // 3 retries
  );
}

/**
 * Schedule or dispatch the repeatable scheduled notifications job.
 */
export async function queueScheduledNotificationsJob(): Promise<void> {
  const queues = JobQueue.getQueues();
  const queue = queues.find((q) => q.name === SCHEDULED_NOTIFICATIONS_QUEUE);
  if (!queue) return;

  const cronPattern = "* * * * *"; // every minute

  await queue.add(
    "every-minute-dispatch",
    {},
    {
      repeat: {
        pattern: cronPattern,
      },
      jobId: "every-minute-notifications-dispatch",
    },
  );
  log.info("Scheduled notifications repeatable job queued successfully");
}
