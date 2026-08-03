import { getRateCardService } from "@ecom/features/di/containers/ShippingRateService";
import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("RateCardScheduler");

/**
 * Scans for superseded default rate cards and archives them if a newer default rate card has become effective.
 * Designed to run hourly via CronRegistry ("0 * * * *").
 */
export async function archiveSupersededDefaultRateCards(
  now: Date = new Date(),
): Promise<{ archivedCount: number; archivedIds: number[] }> {
  const rateService = getRateCardService();
  const result = await rateService.archiveSupersededDefaultRateCards(now);
  if (result.archivedCount > 0) {
    log.info(`Archived ${result.archivedCount} superseded default rate cards`, {
      archivedIds: result.archivedIds,
    });
  }
  return result;
}
