import type { PrismaClient } from "@prisma/client";

export interface AuditLogFilters {
  /** Pre-built Prisma where clause from buildPrismaWhere */
  where?: Record<string, unknown>;
  sortBy?: "id" | "createdAt";
  sortDir?: "asc" | "desc";
}

export class AuditLogRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: {
    userId?: number;
    action: string;
    module: string;
    entityId?: string;
    entityType?: string;
    oldValues?: unknown;
    newValues?: unknown;
    ipAddress?: string;
    userAgent?: string;
    metadata?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        module: data.module,
        entityId: data.entityId,
        entityType: data.entityType,
        oldValues: data.oldValues as never,
        newValues: data.newValues as never,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata as never,
      },
      select: { id: true },
    });
  }

  async findMany(filters: AuditLogFilters, page = 1, perPage = 50) {
    const where = filters.where && Object.keys(filters.where).length > 0 ? filters.where : {};
    const orderBy = filters.sortBy
      ? { [filters.sortBy]: filters.sortDir ?? "desc" }
      : { createdAt: "desc" as const };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          module: true,
          entityId: true,
          entityType: true,
          oldValues: true,
          newValues: true,
          ipAddress: true,
          metadata: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findById(id: number) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      select: {
        id: true,
        action: true,
        module: true,
        entityId: true,
        entityType: true,
        oldValues: true,
        newValues: true,
        ipAddress: true,
        userAgent: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async deleteById(id: number) {
    return this.prisma.auditLog.delete({ where: { id } });
  }

  async deleteAll() {
    return this.prisma.auditLog.deleteMany({});
  }

  async deleteOlderThan(date: Date) {
    return this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: date } },
    });
  }

  async getStats() {
    const [total, todayCount, moduleStats] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ["module"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);
    return {
      total,
      todayCount,
      byModule: moduleStats.map((s) => ({ module: s.module, count: s._count.id })),
    };
  }
}
