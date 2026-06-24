import type { ContentStatus, PrismaClient } from "@ecom/prisma";

export class CategoryRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: number) {
    return this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        isFeatured: true,
        isDefault: true,
        status: true,
        parentId: true,
        authorId: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByIdWithRelations(id: number) {
    return this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        isFeatured: true,
        isDefault: true,
        status: true,
        parentId: true,
        authorId: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          select: { id: true, name: true, slug: true, order: true },
          orderBy: { order: "asc" },
        },
        translations: {
          select: {
            id: true,
            langCode: true,
            name: true,
            description: true,
          },
        },
        seoMeta: {
          select: {
            id: true,
            seoTitle: true,
            seoDescription: true,
            seoImage: true,
            indexMode: true,
          },
        },
        _count: {
          select: { posts: true },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.category.findUnique({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        status: true,
        parentId: true,
        _count: {
          select: { posts: true },
        },
      },
    });
  }

  async findMany(options?: {
    search?: string;
    where?: Record<string, unknown>;
    status?: ContentStatus;
    parentId?: number | null;
    includeDeleted?: boolean;
    page?: number;
    perPage?: number;
    sortBy?: "id" | "name" | "createdAt" | "status" | "order";
    sortDir?: "asc" | "desc";
  }) {
    const {
      search,
      where: prismaWhere,
      status,
      parentId,
      includeDeleted = false,
      page = 1,
      perPage = 50,
      sortBy,
      sortDir,
    } = options ?? {};

    const conditions: Record<string, unknown>[] = [];

    if (!includeDeleted) {
      conditions.push({ deletedAt: null });
    }

    if (status) {
      conditions.push({ status });
    }

    if (parentId !== undefined) {
      conditions.push({ parentId });
    }

    if (prismaWhere && Object.keys(prismaWhere).length > 0) {
      conditions.push(prismaWhere);
    }

    if (search?.trim()) {
      conditions.push({
        name: { contains: search.trim(), mode: "insensitive" as const },
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const orderBy = sortBy
      ? { [sortBy]: sortDir ?? "asc" }
      : [{ order: "asc" as const }, { name: "asc" as const }];

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          isFeatured: true,
          isDefault: true,
          status: true,
          parentId: true,
          order: true,
          createdAt: true,
          _count: {
            select: { posts: true, children: true },
          },
        },
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      items,
      rows: items,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  async findTree() {
    return this.prisma.category.findMany({
      where: { parentId: null, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        status: true,
        order: true,
        children: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            status: true,
            order: true,
            children: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                slug: true,
                icon: true,
                status: true,
                order: true,
              },
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
    description?: string;
    icon?: string;
    isFeatured?: number;
    isDefault?: number;
    status?: ContentStatus;
    parentId?: number;
    authorId?: number;
    order?: number;
  }) {
    return this.prisma.category.create({
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      icon?: string | null;
      isFeatured?: number;
      isDefault?: number;
      status?: ContentStatus;
      parentId?: number | null;
      order?: number;
    },
  ) {
    return this.prisma.category.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async softDelete(id: number) {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  async restore(id: number) {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: null },
      select: { id: true, deletedAt: true },
    });
  }

  async hardDelete(id: number) {
    return this.prisma.category.delete({
      where: { id },
      select: { id: true },
    });
  }
}
