import type { PrismaClient } from "@ecom/prisma";

export class RoleRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMany() {
    return this.prisma.role.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { users: true, permissions: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: number) {
    return this.prisma.role.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            permission: {
              select: { id: true, name: true, displayName: true, group: true },
            },
          },
        },
        _count: { select: { users: true } },
      },
    });
  }

  async findByName(name: string) {
    return this.prisma.role.findUnique({
      where: { name },
      select: { id: true, name: true },
    });
  }

  async create(data: { name: string; displayName?: string; description?: string }) {
    return this.prisma.role.create({
      data,
      select: { id: true, name: true, displayName: true, description: true },
    });
  }

  async update(id: number, data: { displayName?: string; description?: string }) {
    return this.prisma.role.update({
      where: { id },
      data,
      select: { id: true, name: true, displayName: true, description: true },
    });
  }

  async delete(id: number) {
    return this.prisma.role.delete({ where: { id } });
  }

  async syncPermissions(roleId: number, permissionIds: number[]) {
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...permissionIds.map((permissionId) =>
        this.prisma.rolePermission.create({
          data: { roleId, permissionId },
        }),
      ),
    ]);
  }
}
