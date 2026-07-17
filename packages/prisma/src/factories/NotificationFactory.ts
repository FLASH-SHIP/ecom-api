import crypto from "node:crypto";
import type { Notification, Prisma } from "../generated/prisma/client";
import { prisma } from "../index";

export class NotificationFactory {
  private overrides: Partial<Prisma.NotificationUncheckedCreateInput> = {};

  static new(): NotificationFactory {
    return new NotificationFactory();
  }

  forUser(userId: string): this {
    this.overrides.userId = userId;
    this.overrides.customerId = null;
    return this;
  }

  forCustomer(customerId: string): this {
    this.overrides.customerId = customerId;
    this.overrides.userId = null;
    return this;
  }

  read(): this {
    this.overrides.isRead = true;
    return this;
  }

  unread(): this {
    this.overrides.isRead = false;
    return this;
  }

  sensitive(): this {
    this.overrides.isSensitive = true;
    return this;
  }

  marketing(): this {
    this.overrides.deliveryClass = "MARKETING";
    return this;
  }

  build(
    overrides: Partial<Prisma.NotificationUncheckedCreateInput> = {},
  ): Prisma.NotificationUncheckedCreateInput {
    return NotificationFactory.build({ ...this.overrides, ...overrides });
  }

  async create(
    overrides: Partial<Prisma.NotificationUncheckedCreateInput> = {},
  ): Promise<Notification> {
    const data = this.build(overrides);
    return prisma.notification.create({
      data: data as Prisma.NotificationUncheckedCreateInput,
    });
  }

  static build(
    overrides: Partial<Prisma.NotificationUncheckedCreateInput> = {},
  ): Prisma.NotificationUncheckedCreateInput {
    const randomId = Math.random().toString(36).substring(7);
    return {
      type: overrides.type ?? "system.alert",
      titleKey: overrides.titleKey ?? `notifications.test.title_${randomId}`,
      messageKey: overrides.messageKey ?? `notifications.test.message_${randomId}`,
      variables: overrides.variables ?? {},
      link: overrides.link ?? `/test-link-${randomId}`,
      referenceId: overrides.referenceId ?? `ref-${randomId}`,
      referenceType: overrides.referenceType ?? "Test",
      isRead: overrides.isRead ?? false,
      isSensitive: overrides.isSensitive ?? false,
      deliveryClass: overrides.deliveryClass ?? "TRANSACTIONAL",
      idempotencyKey: overrides.idempotencyKey ?? `idem-${randomId}`,
      ...overrides,
    };
  }

  static async create(
    overrides: Partial<Prisma.NotificationUncheckedCreateInput> = {},
  ): Promise<Notification> {
    const data = NotificationFactory.build(overrides);
    return prisma.notification.create({
      data: data as Prisma.NotificationUncheckedCreateInput,
    });
  }
}
