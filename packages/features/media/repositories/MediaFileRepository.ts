import type { PrismaClient } from "@ecom/prisma";

export class MediaFileRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMany(options?: {
    folderId?: number | null;
    mimeType?: string;
    search?: string;
    page?: number;
    perPage?: number;
    sortBy?: "createdAt" | "name" | "size";
    sortOrder?: "asc" | "desc";
  }) {
    const page = options?.page ?? 1;
    const perPage = options?.perPage ?? 30;
    const sortBy = options?.sortBy ?? "createdAt";
    const sortOrder = options?.sortOrder ?? "desc";

    const where = {
      ...(options?.folderId !== undefined ? { folderId: options.folderId } : {}),
      ...(options?.mimeType ? { mimeType: { startsWith: options.mimeType } } : {}),
      ...(options?.search
        ? {
            OR: [
              { name: { contains: options.search, mode: "insensitive" as const } },
              { alt: { contains: options.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [files, total] = await Promise.all([
      this.prisma.mediaFile.findMany({
        where,
        select: {
          id: true,
          name: true,
          fileName: true,
          mimeType: true,
          size: true,
          url: true,
          disk: true,
          width: true,
          height: true,
          alt: true,
          folderId: true,
          uploadedBy: true,
          createdAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.mediaFile.count({ where }),
    ]);

    return {
      data: files,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findById(id: number) {
    return this.prisma.mediaFile.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        fileName: true,
        mimeType: true,
        size: true,
        url: true,
        disk: true,
        width: true,
        height: true,
        alt: true,
        description: true,
        folderId: true,
        uploadedBy: true,
        createdAt: true,
        updatedAt: true,
        folder: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  /** Find a file record by its storage URL. Returns only id + url for lightweight lookup. */
  async findByUrl(url: string) {
    return this.prisma.mediaFile.findFirst({
      where: { url },
      select: { id: true, url: true },
    });
  }

  async create(data: {
    name: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
    disk?: string;
    width?: number;
    height?: number;
    alt?: string;
    description?: string;
    folderId?: number | null;
    uploadedBy?: number;
  }) {
    return this.prisma.mediaFile.create({
      data: {
        name: data.name,
        fileName: data.fileName,
        mimeType: data.mimeType,
        size: data.size,
        url: data.url,
        disk: data.disk ?? "local",
        width: data.width,
        height: data.height,
        alt: data.alt,
        description: data.description,
        folderId: data.folderId ?? null,
        uploadedBy: data.uploadedBy,
      },
      select: {
        id: true,
        name: true,
        fileName: true,
        mimeType: true,
        size: true,
        url: true,
        width: true,
        height: true,
        alt: true,
        folderId: true,
        createdAt: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      alt?: string;
      description?: string;
      folderId?: number | null;
    },
  ) {
    return this.prisma.mediaFile.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        fileName: true,
        mimeType: true,
        size: true,
        url: true,
        width: true,
        height: true,
        alt: true,
        description: true,
        folderId: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.mediaFile.delete({ where: { id } });
  }

  async moveToFolder(ids: number[], folderId: number | null) {
    return this.prisma.mediaFile.updateMany({
      where: { id: { in: ids } },
      data: { folderId },
    });
  }

  async deleteMany(ids: number[]) {
    return this.prisma.mediaFile.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async countByFolder(folderId: number | null) {
    return this.prisma.mediaFile.count({
      where: { folderId },
    });
  }

  async getTotalStats() {
    const [totalFiles, totalSize] = await Promise.all([
      this.prisma.mediaFile.count(),
      this.prisma.mediaFile.aggregate({ _sum: { size: true } }),
    ]);

    return {
      totalFiles,
      totalSize: totalSize._sum.size ?? 0,
    };
  }
}
