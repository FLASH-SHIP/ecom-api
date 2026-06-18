import { prisma } from "@ecom/prisma";

export class TaxonomyRepository {
  async findMany(options?: {
    type?: string;
    parentId?: number | null;
    search?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = options?.page ?? 1;
    const perPage = options?.perPage ?? 100;
    const where = {
      ...(options?.type && { type: options.type }),
      ...(options?.parentId !== undefined && { parentId: options.parentId }),
      ...(options?.search && {
        OR: [
          { name: { contains: options.search, mode: "insensitive" as const } },
          { slug: { contains: options.search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.taxonomy.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          description: true,
          parentId: true,
          order: true,
          metadata: true,
          createdAt: true,
          _count: { select: { children: true } },
        },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.taxonomy.count({ where }),
    ]);

    return { items, total, page, perPage };
  }

  async findById(id: number) {
    return prisma.taxonomy.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        parentId: true,
        order: true,
        metadata: true,
        createdAt: true,
        children: {
          select: { id: true, name: true, slug: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async findBySlugAndType(slug: string, type: string) {
    return prisma.taxonomy.findUnique({
      where: { slug_type: { slug, type } },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        parentId: true,
      },
    });
  }

  async getTree(type: string) {
    return prisma.taxonomy.findMany({
      where: { type, parentId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        order: true,
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            order: true,
            children: {
              select: { id: true, name: true, slug: true, order: true },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });
  }

  async create(data: {
    name: string;
    slug: string;
    type: string;
    description?: string;
    parentId?: number;
    order?: number;
    metadata?: Record<string, unknown>;
  }) {
    const { parentId, metadata, ...rest } = data;
    return prisma.taxonomy.create({
      data: {
        ...rest,
        ...(parentId && { parent: { connect: { id: parentId } } }),
        ...(metadata && { metadata: metadata as object }),
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      parentId?: number | null;
      order?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    const { parentId, metadata, ...rest } = data;
    return prisma.taxonomy.update({
      where: { id },
      data: {
        ...rest,
        ...(parentId !== undefined && {
          parent: parentId ? { connect: { id: parentId } } : { disconnect: true },
        }),
        ...(metadata !== undefined && { metadata: metadata as object }),
      },
    });
  }

  async delete(id: number) {
    return prisma.taxonomy.delete({ where: { id } });
  }

  async getTypes() {
    const result = await prisma.taxonomy.groupBy({
      by: ["type"],
      _count: { id: true },
    });
    return result.map((r) => ({ type: r.type, count: r._count.id }));
  }
}
