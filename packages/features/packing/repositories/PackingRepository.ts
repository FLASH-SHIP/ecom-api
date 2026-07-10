import type { ContentStatus, PrismaClient } from "@ecom/prisma";

export class PackingRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: number) {
    return this.prisma.packingType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        image: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByName(name: string) {
    return this.prisma.packingType.findFirst({
      where: {
        name,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        image: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async list(params: {
    search?: string;
    status?: ContentStatus;
    skip?: number;
    take?: number;
    orderBy?: "asc" | "desc";
  }) {
    const where: any = {
      deletedAt: null,
    };

    if (params.search) {
      where.name = {
        contains: params.search,
        mode: "insensitive",
      };
    }

    if (params.status) {
      where.status = params.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.packingType.findMany({
        where,
        select: {
          id: true,
          name: true,
          image: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: params.skip,
        take: params.take,
        orderBy: {
          createdAt: params.orderBy || "desc",
        },
      }),
      this.prisma.packingType.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: {
    name: string;
    image?: string | null;
    description?: string | null;
    status?: ContentStatus;
  }) {
    return this.prisma.packingType.create({
      data,
      select: {
        id: true,
        name: true,
        image: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      image?: string | null;
      description?: string | null;
      status?: ContentStatus;
    }
  ) {
    return this.prisma.packingType.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        image: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async softDelete(id: number) {
    return this.prisma.packingType.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }
}
