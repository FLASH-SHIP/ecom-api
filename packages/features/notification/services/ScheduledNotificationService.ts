import type { CustomerRepository } from "@ecom/features/customer/repositories/CustomerRepository";
import type { UserRepository } from "@ecom/features/rbac/repositories/UserRepository";
import { ErrorCode } from "@ecom/lib/errorCodes";
import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";
import type { ScheduledNotificationRepository } from "../repositories/ScheduledNotificationRepository";
import type { NotificationService } from "./NotificationService";

const log = createLogger("ScheduledNotificationService");

interface IScheduledNotificationDeps {
  scheduledRepo: ScheduledNotificationRepository;
  notificationService: NotificationService;
  userRepo: UserRepository;
  customerRepo: CustomerRepository;
}

export class ScheduledNotificationService {
  constructor(private deps: IScheduledNotificationDeps) {}

  async create(data: {
    targetType: string;
    targetIds?: string[];
    title: string;
    message: string;
    link?: string | null;
    scheduledAt: Date;
  }) {
    if (data.scheduledAt.getTime() < Date.now() - 60000) {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Cannot schedule a notification in the past",
      );
    }
    return this.deps.scheduledRepo.create(data);
  }

  async delete(id: number) {
    const existing = await this.deps.scheduledRepo.findById(id);
    if (!existing) {
      throw ErrorWithCode.Factory.NotFound("Scheduled notification not found");
    }
    if (existing.status !== "PENDING") {
      throw new ErrorWithCode(
        ErrorCode.ValidationError,
        "Can only delete pending scheduled notifications",
      );
    }
    return this.deps.scheduledRepo.delete(id);
  }

  async list(params: { page: number; perPage: number }) {
    return this.deps.scheduledRepo.list(params);
  }

  private async resolveRecipients(
    targetType: string,
    targetIds: string[],
  ): Promise<{ id: string; email: string | null }[]> {
    if (targetType === "ALL_CUSTOMERS") {
      return this.deps.customerRepo.getAllIdsAndEmails();
    }
    if (targetType === "ADMIN_USERS") {
      return this.deps.userRepo.getAllIdsAndEmails();
    }
    if (targetType === "SPECIFIC_CUSTOMERS") {
      const all = await this.deps.customerRepo.getAllIdsAndEmails();
      const targetSet = new Set(targetIds);
      return all.filter((c) => targetSet.has(c.id));
    }
    if (targetType === "SPECIFIC_USERS") {
      const all = await this.deps.userRepo.getAllIdsAndEmails();
      const targetSet = new Set(targetIds);
      return all.filter((u) => targetSet.has(u.id));
    }
    return [];
  }

  private async dispatchSingleItem(item: {
    id: number;
    title: string;
    message: string;
    link: string | null;
    targetType: string;
    targetIds: unknown;
  }): Promise<void> {
    try {
      // Mark as processing
      await this.deps.scheduledRepo.update(item.id, { status: "PROCESSING" });

      const targetIds = (item.targetIds as string[]) || [];
      const recipients = await this.resolveRecipients(item.targetType, targetIds);

      log.info(`Dispatching scheduled notification ${item.id} to ${recipients.length} recipients`);

      const isCustomer =
        item.targetType === "ALL_CUSTOMERS" || item.targetType === "SPECIFIC_CUSTOMERS";

      const batchSize = 50;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        await Promise.all(
          batch.map((recipient) =>
            this.deps.notificationService
              .notify({
                userId: isCustomer ? undefined : recipient.id,
                customerId: isCustomer ? recipient.id : undefined,
                type: "manual.broadcast",
                titleKey: item.title,
                messageKey: item.message,
                link: item.link,
                emailRecipient: recipient.email,
                deliveryClass: "MARKETING",
              })
              .catch((err) => {
                const errStr = err instanceof Error ? err.message : String(err);
                log.error(`Failed to dispatch broadcast to recipient ${recipient.id}: ${errStr}`);
              }),
          ),
        );
      }

      await this.deps.scheduledRepo.update(item.id, { status: "SENT" });
      log.info(`Successfully dispatched scheduled notification ${item.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`Failed to dispatch scheduled notification ${item.id}: ${msg}`, { error: err });
      await this.deps.scheduledRepo.update(item.id, {
        status: "FAILED",
        failedReason: msg,
      });
    }
  }

  async dispatchDueNotifications() {
    const now = new Date();
    const dueNotifications = await this.deps.scheduledRepo.findPendingBefore(now);
    if (dueNotifications.length === 0) return;

    log.info(`Found ${dueNotifications.length} due scheduled notifications to dispatch`);

    for (const item of dueNotifications) {
      await this.dispatchSingleItem(item);
    }
  }
}
