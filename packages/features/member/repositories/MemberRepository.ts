import type { MemberStatus, PrismaClient } from "@prisma/client";

export interface MemberFilters {
  status?: MemberStatus;
  search?: string;
}

export class MemberRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMany(filters: MemberFilters, page = 1, perPage = 50) {
    const where = this.buildWhere(filters);
    const [items, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatarUrl: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { activityLogs: true, socialAccounts: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.member.count({ where }),
    ]);
    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findById(id: number) {
    return this.prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        socialAccounts: {
          select: { id: true, provider: true, email: true, name: true, createdAt: true },
        },
        activityLogs: {
          select: { id: true, action: true, ipAddress: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.member.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, status: true, hashedPassword: true },
    });
  }

  async create(data: { email: string; name?: string; phone?: string; hashedPassword?: string }) {
    return this.prisma.member.create({
      data,
      select: { id: true, email: true, name: true },
    });
  }

  async update(
    id: number,
    data: { name?: string; phone?: string; avatarUrl?: string; status?: MemberStatus },
  ) {
    return this.prisma.member.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, status: true },
    });
  }

  async delete(id: number) {
    return this.prisma.member.delete({ where: { id } });
  }

  async getStats() {
    const [total, active, inactive, banned] = await Promise.all([
      this.prisma.member.count(),
      this.prisma.member.count({ where: { status: "ACTIVE" } }),
      this.prisma.member.count({ where: { status: "INACTIVE" } }),
      this.prisma.member.count({ where: { status: "BANNED" } }),
    ]);
    return { total, active, inactive, banned };
  }

  // ─── Auth-related methods ──────────────────────────

  async findByEmailWithPassword(email: string) {
    return this.prisma.member.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        hashedPassword: true,
        status: true,
      },
    });
  }

  async findByIdWithPassword(id: number) {
    return this.prisma.member.findUnique({
      where: { id },
      select: { id: true, hashedPassword: true },
    });
  }

  async createWithPassword(data: { email: string; name?: string; hashedPassword: string }) {
    return this.prisma.member.create({
      data,
      select: { id: true, email: true, name: true },
    });
  }

  async updatePassword(id: number, hashedPassword: string) {
    return this.prisma.member.update({
      where: { id },
      data: { hashedPassword },
      select: { id: true },
    });
  }

  async updateLastLogin(id: number) {
    return this.prisma.member.update({
      where: { id },
      data: { lastLoginAt: new Date() },
      select: { id: true },
    });
  }

  private buildWhere(filters: MemberFilters) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { name: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search } },
      ];
    }
    return where;
  }
}
