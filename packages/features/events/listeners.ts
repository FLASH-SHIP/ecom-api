import { CacheKeys, responseCache } from "@ecom/features/cache/ResponseCache";
import { createLogger } from "@ecom/lib/logger";
import { eventBus } from "./EventBus";

const log = createLogger("EventListeners");

let registered = false;

export function registerEventListeners() {
  if (registered) return;
  registered = true;

  log.info("Registering domain event listeners...");

  // Cache invalidation listeners
  eventBus.on("post.published", ({ slug }) => {
    log.info(`Event [post.published]: invalidating cache for post: ${slug}`);
    responseCache.forget(`${CacheKeys.PUBLIC_POST}${slug}`);
    responseCache.forgetByPrefix(CacheKeys.CATEGORIES);
  });

  eventBus.on("post.unpublished", () => {
    log.info("Event [post.unpublished]: invalidating public post caches");
    responseCache.forgetByPrefix(CacheKeys.PUBLIC_POST);
  });

  eventBus.on("post.deleted", () => {
    log.info("Event [post.deleted]: invalidating public post caches");
    responseCache.forgetByPrefix(CacheKeys.PUBLIC_POST);
  });

  // Order Webhook triggers
  eventBus.on("order.created", async (payload) => {
    log.info(`Event [order.created]: dispatching webhooks for customer ${payload.customerId}`);
    const { getWebhookService } = await import("@ecom/features/di/containers/WebhookService");
    const webhookService = getWebhookService();
    await webhookService.dispatch("order.created", payload, {
      ownerId: payload.customerId,
      ownerType: "Customer",
    });
  });

  eventBus.on("order.status_updated", async (payload) => {
    log.info(
      `Event [order.status_updated]: dispatching webhooks for customer ${payload.customerId}`,
    );
    const { getWebhookService } = await import("@ecom/features/di/containers/WebhookService");
    const webhookService = getWebhookService();
    await webhookService.dispatch("order.status_updated", payload, {
      ownerId: payload.customerId,
      ownerType: "Customer",
    });
  });

  eventBus.on("order.checkpoint_added", async (payload) => {
    log.info(
      `Event [order.checkpoint_added]: dispatching webhooks for customer ${payload.customerId}`,
    );
    const { getWebhookService } = await import("@ecom/features/di/containers/WebhookService");
    const webhookService = getWebhookService();
    await webhookService.dispatch("order.checkpoint_added", payload, {
      ownerId: payload.customerId,
      ownerType: "Customer",
    });
  });

  eventBus.on("webhook.deactivated", async (payload) => {
    log.info(`Event [webhook.deactivated]: sending alert for webhook ${payload.webhookId}`);
    if (payload.ownerId) {
      const { getNotificationService } = await import(
        "@ecom/features/di/containers/NotificationService"
      );
      const notificationService = getNotificationService();
      await notificationService.notify({
        userId: payload.ownerId,
        type: "WEBHOOK_DEACTIVATED",
        title: "Webhook Auto-Deactivated",
        message: `Webhook "${payload.name}" to ${payload.url} has been auto-deactivated due to 50 consecutive delivery failures.`,
        referenceId: payload.webhookId,
        referenceType: "Webhook",
      });
    }
  });
}
