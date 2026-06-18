import type { PrismaClient } from "@prisma/client";

export interface RequestLogFilters {
  /** Pre-built Prisma where clause from buildPrismaWhere */
  where?: Record<string, unknown>;
  /** URL search from global search bar */
  search?: string;
  sortBy?: "id" | "createdAt" | "statusCode" | "duration";
  sortDir?: "asc" | "desc";
}

export class RequestLogRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: {
    userId?: number;
    method: string;
    url: string;
    statusCode?: number;
    duration?: number;
    ipAddress?: string;
    userAgent?: string;
    referer?: string;
    metadata?: unknown;
  }) {
    return this.prisma.requestLog.create({
      data: {
        userId: data.userId,
        method: data.method,
        url: data.url,
        statusCode: data.statusCode,
        duration: data.duration,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        referer: data.referer,
        metadata: data.metadata as never,
      },
      select: { id: true },
    });
  }

  async findMany(filters: RequestLogFilters, page = 1, perPage = 50) {
    const conditions: Record<string, unknown>[] = [];

    if (filters.where && Object.keys(filters.where).length > 0) {
      conditions.push(filters.where);
    }

    if (filters.search?.trim()) {
      conditions.push({
        url: { contains: filters.search.trim(), mode: "insensitive" },
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};
    const { sortBy = "createdAt", sortDir = "desc" } = filters;
    const [items, total] = await Promise.all([
      this.prisma.requestLog.findMany({
        where,
        select: {
          id: true,
          method: true,
          url: true,
          statusCode: true,
          duration: true,
          ipAddress: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.requestLog.count({ where }),
    ]);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async deleteById(id: number) {
    return this.prisma.requestLog.delete({ where: { id } });
  }

  async deleteOlderThan(date: Date) {
    return this.prisma.requestLog.deleteMany({
      where: { createdAt: { lt: date } },
    });
  }

  async getStats() {
    const [total, todayCount, methodStats, errorCount] = await Promise.all([
      this.prisma.requestLog.count(),
      this.prisma.requestLog.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.requestLog.groupBy({
        by: ["method"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      this.prisma.requestLog.count({
        where: { statusCode: { gte: 400 } },
      }),
    ]);
    return {
      total,
      todayCount,
      errorCount,
      byMethod: methodStats.map((s) => ({ method: s.method, count: s._count.id })),
    };
  }
}
