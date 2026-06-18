import type { PrismaClient } from "@ecom/prisma";

export class MediaFolderRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMany(options?: { parentId?: number | null; search?: string }) {
    return this.prisma.mediaFolder.findMany({
      where: {
        ...(options?.parentId !== undefined ? { parentId: options.parentId } : {}),
        ...(options?.search
          ? { name: { contains: options.search, mode: "insensitive" as const } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { files: true, children: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: number) {
    return this.prisma.mediaFolder.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByIdWithChildren(id: number) {
    return this.prisma.mediaFolder.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        children: {
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" },
        },
        _count: { select: { files: true, children: true } },
      },
    });
  }

  async findTree() {
    return this.prisma.mediaFolder.findMany({
      where: { parentId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            children: {
              select: { id: true, name: true, slug: true },
              orderBy: { name: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
        _count: { select: { files: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async create(data: { name: string; slug: string; parentId?: number | null }) {
    return this.prisma.mediaFolder.create({
      data: {
        name: data.name,
        slug: data.slug,
        parentId: data.parentId ?? null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        createdAt: true,
      },
    });
  }

  async update(id: number, data: { name?: string; slug?: string; parentId?: number | null }) {
    return this.prisma.mediaFolder.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.mediaFolder.delete({ where: { id } });
  }

  async hasChildren(id: number): Promise<boolean> {
    const count = await this.prisma.mediaFolder.count({ where: { parentId: id } });
    return count > 0;
  }

  async hasFiles(id: number): Promise<boolean> {
    const count = await this.prisma.mediaFile.count({ where: { folderId: id } });
    return count > 0;
  }
}
