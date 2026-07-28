import type { ContentStatus, PrismaClient } from "@ecom/prisma";
import { slugify } from "@flash-ship/ecom-lib/slugify";

export class TagRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: number) {
    return this.prisma.tag.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        authorId: true,
        authorType: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByIdWithRelations(id: number) {
    return this.prisma.tag.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        authorId: true,
        authorType: true,
        createdAt: true,
        updatedAt: true,
        translations: {
          select: {
            id: true,
            langCode: true,
            name: true,
            description: true,
          },
        },
        _count: {
          select: { posts: true },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.tag.findFirst({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        _count: {
          select: { posts: true },
        },
      },
    });
  }

  async findMany(options?: {
    search?: string;
    where?: Record<string, unknown>;
    page?: number;
    perPage?: number;
    sortBy?: "id" | "name" | "createdAt" | "status";
    sortDir?: "asc" | "desc";
  }) {
    const { search, where: prismaWhere, page = 1, perPage = 25, sortBy, sortDir } = options ?? {};

    const conditions: Record<string, unknown>[] = [{ deletedAt: null }];

    if (prismaWhere && Object.keys(prismaWhere).length > 0) {
      conditions.push(prismaWhere);
    }

    if (search?.trim()) {
      conditions.push({
        name: { contains: search.trim(), mode: "insensitive" as const },
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const orderBy = sortBy ? { [sortBy]: sortDir ?? "asc" } : { id: "desc" as const };

    const [rows, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
          _count: {
            select: { posts: true },
          },
        },
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.tag.count({ where }),
    ]);

    return { rows, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findOrCreateByNames(names: string[]) {
    const results = [];
    for (const name of names) {
      const slug = slugify(name);

      const tag = await this.prisma.tag.upsert({
        where: { slug },
        create: { name, slug },
        update: {},
        select: { id: true, name: true, slug: true },
      });
      results.push(tag);
    }
    return results;
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    status?: ContentStatus;
    authorId?: string;
    authorType?: string;
  }) {
    return this.prisma.tag.create({
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
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
      description?: string;
      status?: ContentStatus;
    },
  ) {
    return this.prisma.tag.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async softDelete(id: number) {
    return this.prisma.tag.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async restore(id: number) {
    return this.prisma.tag.update({
      where: { id },
      data: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async hardDelete(id: number) {
    return this.prisma.tag.delete({
      where: { id },
      select: { id: true },
    });
  }
}
