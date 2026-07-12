import type { PrismaClient, UserStatus } from "@ecom/prisma";

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
          phone: true,
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

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        phone: true,
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
    phone?: string | null;
    locale?: string;
    status?: UserStatus;
  }) {
    return this.prisma.user.create({
      data: {
        ...data,
      },
      select: { id: true, email: true, name: true, username: true, phone: true, status: true },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      username?: string;
      phone?: string | null;
      avatarUrl?: string;
      locale?: string;
      status?: UserStatus;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, username: true, phone: true, status: true },
    });
  }

  async setPassword(userId: string, hash: string) {
    await this.prisma.userPassword.upsert({
      where: { userId },
      create: { userId, hash },
      update: { hash },
    });
  }

  async syncRoles(userId: string, roleIds: number[]) {
    await this.prisma.$transaction([
      this.prisma.userRoleAssignment.deleteMany({ where: { userId } }),
      ...roleIds.map((roleId) =>
        this.prisma.userRoleAssignment.create({
          data: { userId, roleId },
        }),
      ),
    ]);
  }

  async toggleSuperAdmin(userId: string, isSuperAdmin: boolean) {
    const adminRole = await this.prisma.role.findUnique({
      where: { name: "admin" },
      select: { id: true },
    });
    if (!adminRole) {
      throw new Error("Super Admin role ('admin') not found in database");
    }

    if (isSuperAdmin) {
      await this.prisma.userRoleAssignment.upsert({
        where: {
          userId_roleId: { userId, roleId: adminRole.id },
        },
        create: { userId, roleId: adminRole.id },
        update: {},
      });
    } else {
      await this.prisma.userRoleAssignment.deleteMany({
        where: { userId, roleId: adminRole.id },
      });
    }
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
