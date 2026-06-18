import { prisma } from "@ecom/prisma";

export class RedirectRepository {
  async findByFromPath(fromPath: string) {
    return prisma.redirect.findUnique({
      where: { fromPath },
      select: {
        id: true,
        fromPath: true,
        toPath: true,
        statusCode: true,
        isActive: true,
        hitCount: true,
      },
    });
  }

  async findMany(options?: {
    search?: string;
    isActive?: boolean;
    page?: number;
    perPage?: number;
  }) {
    const page = options?.page ?? 1;
    const perPage = options?.perPage ?? 50;
    const where = {
      ...(options?.isActive !== undefined && { isActive: options.isActive }),
      ...(options?.search && {
        OR: [
          { fromPath: { contains: options.search, mode: "insensitive" as const } },
          { toPath: { contains: options.search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.redirect.findMany({
        where,
        select: {
          id: true,
          fromPath: true,
          toPath: true,
          statusCode: true,
          isActive: true,
          hitCount: true,
          note: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.redirect.count({ where }),
    ]);

    return { items, total, page, perPage };
  }

  async create(data: {
    fromPath: string;
    toPath: string;
    statusCode?: number;
    isActive?: boolean;
    note?: string;
  }) {
    return prisma.redirect.create({
      data,
      select: {
        id: true,
        fromPath: true,
        toPath: true,
        statusCode: true,
        isActive: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      fromPath?: string;
      toPath?: string;
      statusCode?: number;
      isActive?: boolean;
      note?: string;
    },
  ) {
    return prisma.redirect.update({
      where: { id },
      data,
      select: {
        id: true,
        fromPath: true,
        toPath: true,
        statusCode: true,
        isActive: true,
      },
    });
  }

  async delete(id: number) {
    return prisma.redirect.delete({ where: { id } });
  }

  async incrementHitCount(id: number) {
    return prisma.redirect.update({
      where: { id },
      data: { hitCount: { increment: 1 } },
    });
  }
}
