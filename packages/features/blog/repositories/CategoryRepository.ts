import type { ContentStatus, PrismaClient } from "@prisma/client";

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
    status?: ContentStatus;
    parentId?: number | null;
    includeDeleted?: boolean;
    page?: number;
    perPage?: number;
  }) {
    const { status, parentId, includeDeleted = false, page = 1, perPage = 50 } = options ?? {};

    const where = {
      ...(!includeDeleted && { deletedAt: null }),
      ...(status && { status }),
      ...(parentId !== undefined && { parentId }),
    };

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
        orderBy: [{ order: "asc" }, { name: "asc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.category.count({ where }),
    ]);

    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
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
    isFeatured?: boolean;
    isDefault?: boolean;
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
      isFeatured?: boolean;
      isDefault?: boolean;
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
