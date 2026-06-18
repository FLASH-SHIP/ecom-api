import type { PrismaClient, UserStatus } from "@prisma/client";

export class UserRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMany(params: {
    search?: string;
    status?: UserStatus;
    page?: number;
    perPage?: number;
  }) {
    const { search, status, page = 1, perPage = 20 } = params;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          avatarUrl: true,
          status: true,
          locale: true,
          createdAt: true,
          roles: {
            select: {
              role: { select: { id: true, name: true, displayName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarUrl: true,
        status: true,
        locale: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            role: { select: { id: true, name: true, displayName: true } },
          },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
  }

  async create(data: {
    email: string;
    name?: string;
    username?: string;
    locale?: string;
    status?: UserStatus;
  }) {
    return this.prisma.user.create({
      data,
      select: { id: true, email: true, name: true, username: true, status: true },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      username?: string;
      avatarUrl?: string;
      locale?: string;
      status?: UserStatus;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, username: true, status: true },
    });
  }

  async setPassword(userId: number, hash: string) {
    await this.prisma.userPassword.upsert({
      where: { userId },
      create: { userId, hash },
      update: { hash },
    });
  }

  async syncRoles(userId: number, roleIds: string[]) {
    await this.prisma.$transaction([
      this.prisma.userRoleAssignment.deleteMany({ where: { userId } }),
      ...roleIds.map((roleId) =>
        this.prisma.userRoleAssignment.create({
          data: { userId, roleId },
        }),
      ),
    ]);
  }

  async delete(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }
}
