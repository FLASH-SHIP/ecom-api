import { getWebhookService } from "../../di/containers/WebhookService";
import { JobQueue } from "../JobQueue";

export const WEBHOOK_QUEUE = "webhook-delivery";

export interface WebhookJobPayload {
  webhookId: number;
  event: string;
  payload: Record<string, unknown>;
  attempt?: number;
  eventId?: string;
}

/**
 * Register the webhook delivery job handler.
 * Call this once during application startup.
 */
export function registerWebhookWorker() {
  JobQueue.register(
    WEBHOOK_QUEUE,
    async (payload) => {
      const data = payload as unknown as WebhookJobPayload;
      const webhookService = getWebhookService();
      await webhookService.executeWebhookDelivery(
        data.webhookId,
        data.event,
        data.payload,
        data.attempt ?? 1,
        data.eventId,
      );
    },
    10, // Increased concurrency to 10 to handle external I/O operations concurrently
  );
}

/**
 * Dispatch a webhook delivery to be processed in the background.
 */
export async function queueWebhookDelivery(
  data: WebhookJobPayload,
  options?: { delay?: number },
): Promise<string> {
  return JobQueue.dispatch(WEBHOOK_QUEUE, data as unknown as Record<string, unknown>, options);
}
