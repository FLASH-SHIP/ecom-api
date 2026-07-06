import type { Prisma, PrismaClient } from "@ecom/prisma";

export interface CustomerGroupFilters {
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export class CustomerGroupRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMany(filters: CustomerGroupFilters, page = 1, perPage = 50) {
    const where: Prisma.CustomerGroupWhereInput = {};
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    let orderBy: Prisma.CustomerGroupOrderByWithRelationInput = { createdAt: "desc" };
    if (filters.sortBy) {
      const dir = filters.sortDir || "desc";
      if (filters.sortBy === "customersCount") {
        orderBy = { customers: { _count: dir } };
      } else if (["id", "name", "code", "createdAt", "updatedAt"].includes(filters.sortBy)) {
        orderBy = { [filters.sortBy]: dir };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.customerGroup.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { customers: true },
          },
        },
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.customerGroup.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  async findAll() {
    return this.prisma.customerGroup.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: number) {
    return this.prisma.customerGroup.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { customers: true, rateCards: true },
        },
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.customerGroup.findUnique({
      where: { code: code.toLowerCase() },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    });
  }

  async create(data: { code: string; name: string; description?: string | null }) {
    return this.prisma.customerGroup.create({
      data: {
        code: data.code.toLowerCase(),
        name: data.name,
        description: data.description,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    });
  }

  async update(id: number, data: { code?: string; name?: string; description?: string | null }) {
    const updateData: Prisma.CustomerGroupUpdateInput = {};
    if (data.name) updateData.name = data.name;
    if (data.code) updateData.code = data.code.toLowerCase();
    if (data.description !== undefined) updateData.description = data.description;

    return this.prisma.customerGroup.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.customerGroup.delete({
      where: { id },
      select: { id: true },
    });
  }
}
