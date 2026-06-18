import type { PrismaClient } from "@prisma/client";

export class PermissionRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll() {
    return this.prisma.permission.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        group: true,
      },
      orderBy: [{ group: "asc" }, { name: "asc" }],
    });
  }

  async findByIds(ids: string[]) {
    return this.prisma.permission.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
  }

  async findByGroup(group: string) {
    return this.prisma.permission.findMany({
      where: { group },
      select: { id: true, name: true, displayName: true, group: true },
      orderBy: { name: "asc" },
    });
  }

  async upsert(data: { name: string; displayName?: string; group?: string }) {
    return this.prisma.permission.upsert({
      where: { name: data.name },
      create: data,
      update: { displayName: data.displayName, group: data.group },
      select: { id: true, name: true, displayName: true, group: true },
    });
  }
}
