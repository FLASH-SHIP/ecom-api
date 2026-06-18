import { prisma } from "@ecom/prisma";

export class MemberActivityLogRepository {
  async create(data: {
    memberId: number;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.memberActivityLog.create({
      data: {
        memberId: data.memberId,
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

  async findByMember(memberId: number, options?: { page?: number; perPage?: number }) {
    const page = options?.page ?? 1;
    const perPage = options?.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const [items, total] = await Promise.all([
      prisma.memberActivityLog.findMany({
        where: { memberId },
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
      prisma.memberActivityLog.count({ where: { memberId } }),
    ]);

    return { items, total, page, perPage };
  }

  async getStats(memberId: number) {
    const total = await prisma.memberActivityLog.count({ where: { memberId } });
    const lastActivity = await prisma.memberActivityLog.findFirst({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      select: { action: true, createdAt: true },
    });
    return { total, lastActivity };
  }
}
