import type { NotificationSetting, Prisma } from "../generated/prisma/client";
import { prisma } from "../index";

export class NotificationSettingFactory {
  private overrides: Partial<Prisma.NotificationSettingUncheckedCreateInput> = {};

  static new(): NotificationSettingFactory {
    return new NotificationSettingFactory();
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

  withEventType(eventType: string): this {
    this.overrides.eventType = eventType;
    return this;
  }

  build(
    overrides: Partial<Prisma.NotificationSettingUncheckedCreateInput> = {},
  ): Prisma.NotificationSettingUncheckedCreateInput {
    return NotificationSettingFactory.build({ ...this.overrides, ...overrides });
  }

  async create(
    overrides: Partial<Prisma.NotificationSettingUncheckedCreateInput> = {},
  ): Promise<NotificationSetting> {
    const data = this.build(overrides);
    return prisma.notificationSetting.create({
      data: data as Prisma.NotificationSettingUncheckedCreateInput,
    });
  }

  static build(
    overrides: Partial<Prisma.NotificationSettingUncheckedCreateInput> = {},
  ): Prisma.NotificationSettingUncheckedCreateInput {
    const randomId = Math.random().toString(36).substring(7);
    return {
      eventType: overrides.eventType ?? `order.status_${randomId}`,
      channelInApp: overrides.channelInApp ?? true,
      channelPush: overrides.channelPush ?? true,
      channelEmail: overrides.channelEmail ?? true,
      channelWebhook: overrides.channelWebhook ?? false,
      dndConfig: overrides.dndConfig !== undefined ? overrides.dndConfig : undefined,
      ...overrides,
    };
  }

  static async create(
    overrides: Partial<Prisma.NotificationSettingUncheckedCreateInput> = {},
  ): Promise<NotificationSetting> {
    const data = NotificationSettingFactory.build(overrides);
    return prisma.notificationSetting.create({
      data: data as Prisma.NotificationSettingUncheckedCreateInput,
    });
  }
}
