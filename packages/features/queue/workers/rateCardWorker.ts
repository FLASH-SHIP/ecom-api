import { createLogger } from "@flash-ship/ecom-lib/logger";
import { getRateCardService } from "../../di/containers/ShippingRateService";
import { JobQueue } from "../JobQueue";

export const RATECARD_QUEUE = "ratecard-archive";
const log = createLogger("RateCardWorker");

/**
 * Register the rate card auto-archive worker.
 * Call this once during application startup.
 */
export function registerRateCardWorker() {
  JobQueue.register(
    RATECARD_QUEUE,
    async () => {
      const rateService = getRateCardService();
      const result = await rateService.archiveSupersededDefaultRateCards();
      if (result.archivedCount > 0) {
        log.info("Rate card auto-archive completed successfully", {
          archivedCount: result.archivedCount,
          archivedIds: result.archivedIds,
        });
      }
    },
    3, // 3 retries
  );
}

/**
 * Schedule or dispatch the repeatable rate card auto-archive job.
 * Default cron pattern: "0 * * * *" (hourly).
 */
export async function queueRateCardJob(): Promise<void> {
  const queues = JobQueue.getQueues();
  const queue = queues.find((q) => q.name === RATECARD_QUEUE);
  if (!queue) return;

  const cronPattern = process.env.RATECARD_ARCHIVE_CRON ?? "0 * * * *";

  await queue.add(
    "hourly-ratecard-archive",
    {},
    {
      repeat: {
        pattern: cronPattern,
      },
      jobId: "repeatable-ratecard-archive",
    },
  );
  log.info("Rate card auto-archive repeatable job queued successfully");
}
