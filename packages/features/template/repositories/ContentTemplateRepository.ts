import { prisma } from "@ecom/prisma";

export class ContentTemplateRepository {
  async findMany(options?: { type?: string; search?: string; isActive?: boolean }) {
    const where = {
      ...(options?.type && { type: options.type }),
      ...(options?.isActive !== undefined && { isActive: options.isActive }),
      ...(options?.search && {
        OR: [
          { name: { contains: options.search, mode: "insensitive" as const } },
          { slug: { contains: options.search, mode: "insensitive" as const } },
        ],
      }),
    };

    return prisma.contentTemplate.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        thumbnail: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: number) {
    return prisma.contentTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        content: true,
        structure: true,
        thumbnail: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
      },
    });
  }

  async findBySlug(slug: string) {
    return prisma.contentTemplate.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        content: true,
        structure: true,
      },
    });
  }

  async create(data: {
    name: string;
    slug: string;
    type: string;
    content?: string;
    structure?: Record<string, unknown>;
    thumbnail?: string;
    createdBy?: number;
  }) {
    const { structure, ...rest } = data;
    return prisma.contentTemplate.create({
      data: {
        ...rest,
        ...(structure && { structure: structure as object }),
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      slug?: string;
      content?: string;
      structure?: Record<string, unknown>;
      thumbnail?: string;
      isActive?: boolean;
    },
  ) {
    const { structure, ...rest } = data;
    return prisma.contentTemplate.update({
      where: { id },
      data: {
        ...rest,
        ...(structure !== undefined && { structure: structure as object }),
      },
    });
  }

  async delete(id: number) {
    return prisma.contentTemplate.delete({ where: { id } });
  }
}
