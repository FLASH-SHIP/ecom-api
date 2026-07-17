import { sendEmail } from "@ecom/emails";
import { createLogger } from "@ecom/lib/logger";
import { getRedisClient } from "@ecom/lib/redis";
import type { NotificationRepository } from "../repositories/NotificationRepository";
import type { DeviceTokenService } from "./DeviceTokenService";
import type { NotificationSettingService } from "./NotificationSettingService";
import type { PushNotificationService } from "./PushNotificationService";

const log = createLogger("NotificationService");

interface INotificationServiceDeps {
  notificationRepo: NotificationRepository;
  notificationSettingService: NotificationSettingService;
  deviceTokenService: DeviceTokenService;
  pushNotificationService: PushNotificationService;
  config?: {
    deduplicationTtlSec?: number;
    dndDefaultStart?: string;
    dndDefaultEnd?: string;
    timezone?: string;
  };
}

export class NotificationService {
  private deps: INotificationServiceDeps;

  constructor(deps: INotificationServiceDeps) {
    this.deps = deps;
  }

  private async acquireIdempotency(key: string): Promise<boolean> {
    try {
      const redis = getRedisClient();
      const ttl = this.deps.config?.deduplicationTtlSec ?? 86400;
      const acquired = await redis.set(`idem:${key}`, "1", "EX", ttl, "NX");
      return !!acquired;
    } catch (err) {
      log.error("Failed to check idempotency key in Redis, proceeding...", { err });
      return true; // Proceed anyway if Redis is down
    }
  }

  private isQuietHours(dndConfig: unknown, deliveryClass?: string): boolean {
    if (deliveryClass === "TRANSACTIONAL") return false;
    if (!dndConfig) return false;

    try {
      const dnd =
        typeof dndConfig === "string"
          ? JSON.parse(dndConfig)
          : (dndConfig as Record<string, unknown>);

      if (!dnd?.enabled) return false;

      const now = new Date();
      const tz = this.deps.config?.timezone || "Asia/Ho_Chi_Minh";
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const currentTimeString = formatter.format(now);

      const dndStart = String(dnd.start || this.deps.config?.dndDefaultStart || "22:00");
      const dndEnd = String(dnd.end || this.deps.config?.dndDefaultEnd || "06:00");

      if (dndStart < dndEnd) {
        return currentTimeString >= dndStart && currentTimeString <= dndEnd;
      }
      return currentTimeString >= dndStart || currentTimeString <= dndEnd;
    } catch (err) {
      log.error("Failed parsing DND config in check", { err });
      return false;
    }
  }

  private async dispatchPush(
    data: {
      userId?: string | null;
      customerId?: string | null;
      type: string;
      titleKey: string;
      messageKey: string;
      isSensitive?: boolean;
      referenceId?: string | null;
      referenceType?: string | null;
    },
    notificationRecord: { id: number } | null,
  ): Promise<void> {
    const deviceTokens = await this.deps.deviceTokenService.getTokensByOwner({
      userId: data.userId || undefined,
      customerId: data.customerId || undefined,
    });

    const tokens = deviceTokens.map((t) => t.token);
    if (tokens.length === 0) return;

    const pushTitle = data.isSensitive ? "Thông báo mới" : data.titleKey;
    const pushBody = data.isSensitive
      ? "Bạn có thông báo bảo mật mới. Vui lòng mở ứng dụng để xem."
      : data.messageKey;

    const pushResponse = await this.deps.pushNotificationService.sendPushNotification(tokens, {
      title: pushTitle,
      body: pushBody,
      data: {
        notificationId: notificationRecord ? String(notificationRecord.id) : "",
        type: data.type,
        referenceId: data.referenceId || "",
        referenceType: data.referenceType || "",
        isSensitive: data.isSensitive ? "true" : "false",
      },
    });

    if (pushResponse.invalidTokens.length > 0) {
      await this.deps.deviceTokenService.deleteInvalidTokens(pushResponse.invalidTokens);
    }
  }

  private async dispatchEmail(
    recipient: string,
    titleKey: string,
    messageKey: string,
    link?: string | null,
  ): Promise<void> {
    const emailBody = `
      <h3>${titleKey}</h3>
      <p>${messageKey}</p>
      ${link ? `<p><a href="${link}">Nhấp vào đây để xem chi tiết</a></p>` : ""}
    `;

    await sendEmail({
      to: recipient,
      subject: titleKey,
      html: emailBody,
    });
  }

  /**
   * Main dispatch method to send a notification to a User or Customer
   */
  async notify(data: {
    userId?: string | null;
    customerId?: string | null;
    type: string;
    titleKey: string;
    messageKey: string;
    variables?: Record<string, unknown>;
    link?: string | null;
    referenceId?: string | null;
    referenceType?: string | null;
    isSensitive?: boolean;
    deliveryClass?: "TRANSACTIONAL" | "MARKETING";
    idempotencyKey?: string | null;
    emailRecipient?: string | null; // Optional email to override default lookup
  }) {
    if (data.idempotencyKey) {
      const isUnique = await this.acquireIdempotency(data.idempotencyKey);
      if (!isUnique) return null;
    }

    const ownerId = data.userId || data.customerId;
    if (!ownerId) {
      log.error("No recipient (userId or customerId) provided for notification");
      return null;
    }

    // Resolve preferences (Defaults + Overrides)
    const preferences = await this.deps.notificationSettingService.getPreferences({
      userId: data.userId || undefined,
      customerId: data.customerId || undefined,
    });

    const preference = preferences.find((p) => p.eventType === data.type);
    const inAppAllowed = preference?.channels.inApp.value ?? true;
    let pushAllowed = preference?.channels.push.value ?? true;
    let emailAllowed = preference?.channels.email.value ?? true;

    // Check Quiet Hours DND configuration
    if (this.isQuietHours(preference?.dndConfig, data.deliveryClass)) {
      log.info("Quiet Hours (DND) active. Silencing push and email dispatches.", { ownerId });
      pushAllowed = false;
      emailAllowed = false;
    }

    let notificationRecord = null;

    // Dispatch In-App
    if (inAppAllowed) {
      notificationRecord = await this.deps.notificationRepo.create({
        userId: data.userId,
        customerId: data.customerId,
        type: data.type,
        titleKey: data.titleKey,
        messageKey: data.messageKey,
        variables: data.variables,
        link: data.link,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        isSensitive: data.isSensitive,
        deliveryClass: data.deliveryClass,
        idempotencyKey: data.idempotencyKey,
        sentAt: new Date(),
      });
    }

    // Dispatch Push Notification
    if (pushAllowed) {
      await this.dispatchPush(data, notificationRecord);
    }

    // Dispatch Email Notification
    if (emailAllowed && data.emailRecipient) {
      await this.dispatchEmail(data.emailRecipient, data.titleKey, data.messageKey, data.link);
    }

    return notificationRecord;
  }

  // ─── Backward-compatible wrappers and direct database operations ───

  async listNotifications(
    ownerId: string,
    options?: {
      page?: number;
      cursor?: number;
      perPage?: number;
      unreadOnly?: boolean;
      isCustomer?: boolean;
    },
  ) {
    const isCustomer = options?.isCustomer ?? false;

    // Use cursor-based pagination if cursor is provided
    if (options?.cursor !== undefined) {
      return this.deps.notificationRepo.findByOwner(
        {
          userId: !isCustomer ? ownerId : undefined,
          customerId: isCustomer ? ownerId : undefined,
        },
        {
          cursor: options.cursor,
          perPage: options.perPage,
          unreadOnly: options.unreadOnly,
        },
      );
    }

    // Fallback to offset pagination
    if (!isCustomer) {
      return this.deps.notificationRepo.findByUser(ownerId, {
        page: options?.page,
        perPage: options?.perPage,
        unreadOnly: options?.unreadOnly,
      });
    }

    // Offset pagination fallback for customer using findByOwner without cursor
    return this.deps.notificationRepo.findByOwner(
      { customerId: ownerId },
      {
        perPage: options?.perPage,
        unreadOnly: options?.unreadOnly,
      },
    );
  }

  async getUnreadCount(ownerId: string, isCustomer = false) {
    return this.deps.notificationRepo.getUnreadCount({
      userId: !isCustomer ? ownerId : undefined,
      customerId: isCustomer ? ownerId : undefined,
    });
  }

  async markRead(id: number, ownerId: string, isCustomer = false) {
    return this.deps.notificationRepo.markRead(id, {
      userId: !isCustomer ? ownerId : undefined,
      customerId: isCustomer ? ownerId : undefined,
    });
  }

  async markAllRead(ownerId: string, isCustomer = false) {
    return this.deps.notificationRepo.markAllRead({
      userId: !isCustomer ? ownerId : undefined,
      customerId: isCustomer ? ownerId : undefined,
    });
  }

  async deleteNotification(id: number, ownerId: string, isCustomer = false) {
    return this.deps.notificationRepo.delete(id, {
      userId: !isCustomer ? ownerId : undefined,
      customerId: isCustomer ? ownerId : undefined,
    });
  }

  async recordDelivered(id: number) {
    return this.deps.notificationRepo.updateTracking(id, "delivered");
  }

  async recordClicked(id: number) {
    return this.deps.notificationRepo.updateTracking(id, "clicked");
  }

  async cleanOldHistory(readDays: number, unreadDays: number) {
    return this.deps.notificationRepo.purgeOldNotifications({
      readPurgeDays: readDays,
      unreadPurgeDays: unreadDays,
    });
  }
}
