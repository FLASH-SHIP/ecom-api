import type { PrismaClient } from "@ecom/prisma";

export class CustomerActivityLogRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: {
    customerId: string;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.customerActivityLog.create({
      data: {
        customerId: data.customerId,
        action: data.action,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: (data.metadata as never) ?? undefined,
      },
      select: {
        id: true,
        action: true,
        createdAt: true,
      },
    });
  }

  async findByCustomer(customerId: string, options?: { page?: number; perPage?: number }) {
    const page = options?.page ?? 1;
    const perPage = options?.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const [items, total] = await Promise.all([
      this.prisma.customerActivityLog.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        take: perPage,
        skip,
        select: {
          id: true,
          action: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
          createdAt: true,
        },
      }),
      this.prisma.customerActivityLog.count({ where: { customerId } }),
    ]);

    return { items, total, page, perPage };
  }

  async getStats(customerId: string) {
    const total = await this.prisma.customerActivityLog.count({ where: { customerId } });
    const lastActivity = await this.prisma.customerActivityLog.findFirst({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      select: { action: true, createdAt: true },
    });
    return { total, lastActivity };
  }
}
