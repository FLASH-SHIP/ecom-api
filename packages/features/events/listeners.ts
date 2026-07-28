import { CacheKeys, responseCache } from "@ecom/features/cache/ResponseCache";
import { createLogger } from "@flash-ship/ecom-lib/logger";
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

  // Order Webhook and Notification triggers
  eventBus.on("order.created", async (payload) => {
    log.info(
      `Event [order.created]: dispatching webhooks and notifications for customer ${payload.customerId}`,
    );

    // 1. Webhooks
    const { getWebhookService } = await import("@ecom/features/di/containers/WebhookService");
    const webhookService = getWebhookService();
    await webhookService.dispatch("order.created", payload, {
      ownerId: payload.customerId,
      ownerType: "Customer",
    });

    // 2. Notifications
    const { getNotificationService } = await import(
      "@ecom/features/di/containers/NotificationService"
    );
    const { prisma } = await import("@ecom/prisma");
    const customer = await prisma.customer.findUnique({
      where: { id: payload.customerId },
      select: { email: true },
    });

    await getNotificationService().notify({
      customerId: payload.customerId,
      type: "order.created",
      titleKey: "Đơn hàng đã tạo thành công",
      messageKey: `Đơn hàng #${payload.orderCode} đã được tạo thành công.`,
      variables: { orderId: payload.orderId, code: payload.orderCode },
      link: `/orders/${payload.orderId}`,
      referenceId: String(payload.orderId),
      referenceType: "Order",
      deliveryClass: "TRANSACTIONAL",
      idempotencyKey: `order_created_${payload.orderId}`,
      emailRecipient: customer?.email,
    });
  });

  eventBus.on("order.status_updated", async (payload) => {
    log.info(
      `Event [order.status_updated]: dispatching webhooks and notifications for customer ${payload.customerId}`,
    );

    // 1. Webhooks
    const { getWebhookService } = await import("@ecom/features/di/containers/WebhookService");
    const webhookService = getWebhookService();
    await webhookService.dispatch("order.status_updated", payload, {
      ownerId: payload.customerId,
      ownerType: "Customer",
    });

    // 2. Notifications
    const { getNotificationService } = await import(
      "@ecom/features/di/containers/NotificationService"
    );
    const { prisma } = await import("@ecom/prisma");
    const customer = await prisma.customer.findUnique({
      where: { id: payload.customerId },
      select: { email: true },
    });

    await getNotificationService().notify({
      customerId: payload.customerId,
      type: "order.status_updated",
      titleKey: "Cập nhật trạng thái đơn hàng",
      messageKey: `Đơn hàng #${payload.orderCode} chuyển sang trạng thái: ${payload.status}`,
      variables: { orderId: payload.orderId, status: payload.status, code: payload.orderCode },
      link: `/orders/${payload.orderId}`,
      referenceId: String(payload.orderId),
      referenceType: "Order",
      deliveryClass: "TRANSACTIONAL",
      idempotencyKey: `order_status_${payload.orderId}_${payload.status}`,
      emailRecipient: customer?.email,
    });
  });

  eventBus.on("order.checkpoint_added", async (payload) => {
    log.info(
      `Event [order.checkpoint_added]: dispatching webhooks and notifications for customer ${payload.customerId}`,
    );

    // 1. Webhooks
    const { getWebhookService } = await import("@ecom/features/di/containers/WebhookService");
    const webhookService = getWebhookService();
    await webhookService.dispatch("order.checkpoint_added", payload, {
      ownerId: payload.customerId,
      ownerType: "Customer",
    });

    // 2. Notifications
    const { getNotificationService } = await import(
      "@ecom/features/di/containers/NotificationService"
    );

    await getNotificationService().notify({
      customerId: payload.customerId,
      type: "order.checkpoint_added",
      titleKey: "Đơn hàng có hành trình mới",
      messageKey: `Đơn hàng #${payload.orderCode} có cập nhật hành trình mới: ${payload.checkpoint}`,
      variables: {
        orderId: payload.orderId,
        description: payload.checkpoint,
        code: payload.orderCode,
      },
      link: `/orders/${payload.orderId}`,
      referenceId: String(payload.orderId),
      referenceType: "Order",
      deliveryClass: "TRANSACTIONAL",
      idempotencyKey: `order_checkpoint_${payload.orderId}_${payload.checkpoint}`,
    });
  });

  eventBus.on("webhook.deactivated", async (payload) => {
    log.info(`Event [webhook.deactivated]: sending alert for webhook ${payload.webhookId}`);
    if (payload.ownerId) {
      const { getNotificationService } = await import(
        "@ecom/features/di/containers/NotificationService"
      );
      const { prisma } = await import("@ecom/prisma");

      const isCustomer = payload.ownerType === "Customer";
      let email: string | null = null;

      if (isCustomer) {
        const customer = await prisma.customer.findUnique({
          where: { id: payload.ownerId },
          select: { email: true },
        });
        email = customer?.email ?? null;
      } else {
        const user = await prisma.user.findUnique({
          where: { id: payload.ownerId },
          select: { email: true },
        });
        email = user?.email ?? null;
      }

      const notificationService = getNotificationService();
      await notificationService.notify({
        userId: isCustomer ? undefined : payload.ownerId,
        customerId: isCustomer ? payload.ownerId : undefined,
        type: "webhook.deactivated",
        titleKey: "Webhook Auto-Deactivated",
        messageKey: `Webhook "${payload.name}" to ${payload.url} has been auto-deactivated due to 50 consecutive delivery failures.`,
        variables: {
          name: payload.name,
          url: payload.url,
        },
        referenceId: String(payload.webhookId),
        referenceType: "Webhook",
        deliveryClass: "TRANSACTIONAL",
        idempotencyKey: `webhook_deactivated_${payload.webhookId}`,
        emailRecipient: email,
      });
    }
  });
}
