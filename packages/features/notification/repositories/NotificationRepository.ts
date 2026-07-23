import { type Prisma, prisma } from "@ecom/prisma";

export class NotificationRepository {
  async create(data: {
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
    deliveryClass?: string;
    idempotencyKey?: string | null;
    sentAt?: Date | null;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId || null,
        customerId: data.customerId || null,
        type: data.type,
        titleKey: data.titleKey,
        messageKey: data.messageKey,
        variables: (data.variables as Prisma.InputJsonValue) || {},
        link: data.link || null,
        referenceId: data.referenceId || null,
        referenceType: data.referenceType || null,
        isSensitive: data.isSensitive ?? false,
        deliveryClass: data.deliveryClass ?? "TRANSACTIONAL",
        idempotencyKey: data.idempotencyKey || null,
        sentAt: data.sentAt || null,
      },
      select: {
        id: true,
        type: true,
        titleKey: true,
        messageKey: true,
        variables: true,
        link: true,
        isRead: true,
        isSensitive: true,
        deliveryClass: true,
        createdAt: true,
      },
    });
  }

  async findByOwner(
    params: { userId?: string; customerId?: string },
    options?: {
      cursor?: number;
      perPage?: number;
      unreadOnly?: boolean;
      search?: string;
      type?: string;
    },
  ) {
    const limit = options?.perPage ?? 20;

    const where: Prisma.NotificationWhereInput = {};
    if (params.userId) where.userId = params.userId;
    if (params.customerId) where.customerId = params.customerId;
    if (options?.unreadOnly) where.isRead = false;

    const conditions: Prisma.NotificationWhereInput[] = [];

    if (options?.type) {
      conditions.push({
        OR: [{ type: options.type }, { type: { startsWith: `${options.type}.` } }],
      });
    }

    if (options?.search) {
      conditions.push({
        OR: [
          { titleKey: { contains: options.search, mode: "insensitive" } },
          { messageKey: { contains: options.search, mode: "insensitive" } },
        ],
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const items = await prisma.notification.findMany({
      where,
      orderBy: { id: "desc" },
      take: limit + 1, // Fetch 1 extra to determine if next page exists
      cursor: options?.cursor ? { id: options.cursor } : undefined,
      skip: options?.cursor ? 1 : 0,
      select: {
        id: true,
        type: true,
        titleKey: true,
        messageKey: true,
        variables: true,
        link: true,
        isRead: true,
        isSensitive: true,
        deliveryClass: true,
        createdAt: true,
        sentAt: true,
        deliveredAt: true,
        clickedAt: true,
      },
    });

    let nextCursor: number | undefined;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id;
    }

    return {
      items,
      nextCursor,
    };
  }

  /**
   * Legacy finder for backward compatibility with offset-based pagination.
   */
  async findByUser(
    userId: string,
    options?: {
      page?: number;
      perPage?: number;
      unreadOnly?: boolean;
      search?: string;
      type?: string;
    },
  ) {
    const page = options?.page ?? 1;
    const perPage = options?.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const where: Prisma.NotificationWhereInput = { userId };
    if (options?.unreadOnly) where.isRead = false;

    const conditions: Prisma.NotificationWhereInput[] = [];

    if (options?.type) {
      conditions.push({
        OR: [{ type: options.type }, { type: { startsWith: `${options.type}.` } }],
      });
    }

    if (options?.search) {
      conditions.push({
        OR: [
          { titleKey: { contains: options.search, mode: "insensitive" } },
          { messageKey: { contains: options.search, mode: "insensitive" } },
        ],
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { id: "desc" },
        take: perPage,
        skip,
        select: {
          id: true,
          type: true,
          titleKey: true,
          messageKey: true,
          variables: true,
          link: true,
          isRead: true,
          isSensitive: true,
          deliveryClass: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return { items, total, page, perPage };
  }

  async getUnreadCount(params: { userId?: string; customerId?: string }) {
    const where: Prisma.NotificationWhereInput = { isRead: false };
    if (params.userId) where.userId = params.userId;
    if (params.customerId) where.customerId = params.customerId;

    return prisma.notification.count({ where });
  }

  async markRead(id: number, isRead: boolean, params: { userId?: string; customerId?: string }) {
    const where: Prisma.NotificationWhereInput = { id };
    if (params.userId) where.userId = params.userId;
    if (params.customerId) where.customerId = params.customerId;

    return prisma.notification.updateMany({
      where,
      data: { isRead },
    });
  }

  async markAllRead(params: { userId?: string; customerId?: string }) {
    const where: Prisma.NotificationWhereInput = { isRead: false };
    if (params.userId) where.userId = params.userId;
    if (params.customerId) where.customerId = params.customerId;

    return prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });
  }

  async delete(id: number, params: { userId?: string; customerId?: string }) {
    const where: Prisma.NotificationWhereInput = { id };
    if (params.userId) where.userId = params.userId;
    if (params.customerId) where.customerId = params.customerId;

    return prisma.notification.deleteMany({
      where,
    });
  }

  async updateTracking(id: number, field: "delivered" | "clicked") {
    const data: Prisma.NotificationUpdateInput = {};
    if (field === "delivered") data.deliveredAt = new Date();
    if (field === "clicked") data.clickedAt = new Date();

    return prisma.notification.updateMany({
      where: { id },
      data,
    });
  }

  async purgeOldNotifications(params: { readPurgeDays: number; unreadPurgeDays: number }) {
    const now = new Date();

    const readThreshold = new Date(now);
    readThreshold.setDate(readThreshold.getDate() - params.readPurgeDays);

    const unreadThreshold = new Date(now);
    unreadThreshold.setDate(unreadThreshold.getDate() - params.unreadPurgeDays);

    const deletedRead = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: readThreshold },
      },
    });

    const deletedUnread = await prisma.notification.deleteMany({
      where: {
        isRead: false,
        createdAt: { lt: unreadThreshold },
      },
    });

    return {
      deletedReadCount: deletedRead.count,
      deletedUnreadCount: deletedUnread.count,
    };
  }
}
