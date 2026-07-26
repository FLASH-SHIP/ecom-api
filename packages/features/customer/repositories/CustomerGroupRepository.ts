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

  async findMembers(groupId: number, search?: string, page = 1, perPage = 25) {
    const where: Prisma.CustomerWhereInput = {
      groupId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          phone: true,
          groupId: true,
          createdAt: true,
          group: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findAvailableCustomers(groupId: number, search?: string, limit = 50) {
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      OR: [{ groupId: { not: groupId } }, { groupId: null }],
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        },
      ];
    }

    return this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        phone: true,
        groupId: true,
        group: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { name: "asc" },
      take: limit,
    });
  }

  async assignMembers(groupId: number, customerIds: string[]) {
    if (customerIds.length === 0) return { count: 0 };
    return this.prisma.customer.updateMany({
      where: {
        id: { in: customerIds },
        deletedAt: null,
      },
      data: { groupId },
    });
  }

  async removeMembers(groupId: number, customerIds: string[]) {
    if (customerIds.length === 0) return { count: 0 };
    return this.prisma.customer.updateMany({
      where: {
        id: { in: customerIds },
        groupId,
        deletedAt: null,
      },
      data: { groupId: null },
    });
  }
}
