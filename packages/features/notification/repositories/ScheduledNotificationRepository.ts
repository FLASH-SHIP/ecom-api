import { type Prisma, prisma } from "@ecom/prisma";

export interface CreateScheduledInput {
  targetType: string;
  targetIds?: string[];
  title: string;
  message: string;
  link?: string | null;
  scheduledAt: Date;
}

export interface UpdateScheduledInput {
  status?: string;
  failedReason?: string | null;
}

export class ScheduledNotificationRepository {
  async create(data: CreateScheduledInput) {
    return prisma.scheduledNotification.create({
      data: {
        targetType: data.targetType,
        targetIds: (data.targetIds || null) as Prisma.InputJsonValue,
        title: data.title,
        message: data.message,
        link: data.link || null,
        scheduledAt: data.scheduledAt,
        status: "PENDING",
      },
    });
  }

  async update(id: number, data: UpdateScheduledInput) {
    return prisma.scheduledNotification.update({
      where: { id },
      data: {
        status: data.status,
        failedReason: data.failedReason,
      },
    });
  }

  async delete(id: number) {
    return prisma.scheduledNotification.delete({
      where: { id },
    });
  }

  async findById(id: number) {
    return prisma.scheduledNotification.findUnique({
      where: { id },
    });
  }

  async findPendingBefore(date: Date) {
    return prisma.scheduledNotification.findMany({
      where: {
        status: "PENDING",
        scheduledAt: {
          lte: date,
        },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }

  async list(params: { page: number; perPage: number }) {
    const page = params.page || 1;
    const perPage = params.perPage || 10;
    const skip = (page - 1) * perPage;

    const [items, total] = await Promise.all([
      prisma.scheduledNotification.findMany({
        skip,
        take: perPage,
        orderBy: { scheduledAt: "desc" },
      }),
      prisma.scheduledNotification.count(),
    ]);

    return { items, total };
  }
}
