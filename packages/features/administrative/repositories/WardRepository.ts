import type { Prisma, PrismaClient } from "@ecom/prisma";

export class WardRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: number) {
    return this.prisma.ward.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        divisionType: true,
        codeName: true,
        provinceCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByCode(code: number) {
    return this.prisma.ward.findFirst({
      where: {
        code,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        divisionType: true,
        codeName: true,
        provinceCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByNameAndProvince(name: string, provinceCode: number) {
    return this.prisma.ward.findFirst({
      where: {
        name,
        provinceCode,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        divisionType: true,
        codeName: true,
        provinceCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async list(params: {
    provinceCode?: number;
    search?: string;
    divisionType?: string;
    skip?: number;
    take?: number;
    orderBy?: "asc" | "desc";
  }) {
    const where: Prisma.WardWhereInput = {
      deletedAt: null,
    };

    if (params.provinceCode !== undefined) {
      where.provinceCode = params.provinceCode;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { codeName: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.divisionType) {
      where.divisionType = params.divisionType;
    }

    const [items, total] = await Promise.all([
      this.prisma.ward.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          divisionType: true,
          codeName: true,
          provinceCode: true,
          province: {
            select: {
              name: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        skip: params.skip,
        take: params.take,
        orderBy: {
          code: params.orderBy || "asc",
        },
      }),
      this.prisma.ward.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: {
    name: string;
    code: number;
    divisionType: string;
    codeName: string;
    provinceCode: number;
  }) {
    return this.prisma.ward.create({
      data,
      select: {
        id: true,
        name: true,
        code: true,
        divisionType: true,
        codeName: true,
        provinceCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      code?: number;
      divisionType?: string;
      codeName?: string;
      provinceCode?: number;
    },
  ) {
    return this.prisma.ward.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        code: true,
        divisionType: true,
        codeName: true,
        provinceCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async softDelete(id: number) {
    return this.prisma.ward.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }
}
