import { type Prisma, prisma } from "@ecom/prisma";

export class NotificationSettingRepository {
  async findByOwner(params: { userId?: string; customerId?: string }) {
    return prisma.notificationSetting.findMany({
      where: {
        OR: [
          params.userId ? { userId: params.userId } : {},
          params.customerId ? { customerId: params.customerId } : {},
        ],
      },
    });
  }

  async upsertSetting(data: {
    userId?: string | null;
    customerId?: string | null;
    eventType: string;
    channelInApp: boolean;
    channelPush: boolean;
    channelEmail: boolean;
    channelWebhook: boolean;
    dndConfig?: unknown;
  }) {
    const where: Prisma.NotificationSettingWhereUniqueInput = data.userId
      ? { userId_eventType: { userId: data.userId, eventType: data.eventType } }
      : { customerId_eventType: { customerId: data.customerId || "", eventType: data.eventType } };

    const payload = {
      channelInApp: data.channelInApp,
      channelPush: data.channelPush,
      channelEmail: data.channelEmail,
      channelWebhook: data.channelWebhook,
      dndConfig:
        data.dndConfig !== undefined ? (data.dndConfig as Prisma.InputJsonValue) : undefined,
    };

    return prisma.notificationSetting.upsert({
      where,
      create: {
        userId: data.userId || null,
        customerId: data.customerId || null,
        eventType: data.eventType,
        ...payload,
      },
      update: payload,
    });
  }
}
