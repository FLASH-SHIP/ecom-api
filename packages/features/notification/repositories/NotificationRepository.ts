import { prisma } from "@ecom/prisma";

export class NotificationRepository {
  async create(data: {
    userId: number;
    type: string;
    title: string;
    message: string;
    link?: string;
    referenceId?: number;
    referenceType?: string;
  }) {
    return prisma.notification.create({
      data,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
    });
  }

  async findByUser(
    userId: number,
    options?: { page?: number; perPage?: number; unreadOnly?: boolean },
  ) {
    const page = options?.page ?? 1;
    const perPage = options?.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const where: { userId: number; isRead?: boolean } = { userId };
    if (options?.unreadOnly) where.isRead = false;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: perPage,
        skip,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          link: true,
          isRead: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return { items, total, page, perPage };
  }

  async getUnreadCount(userId: number) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markRead(id: number, userId: number) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: number) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async delete(id: number, userId: number) {
    return prisma.notification.deleteMany({
      where: { id, userId },
    });
  }
}
