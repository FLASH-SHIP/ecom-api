import type { Prisma, PrismaClient } from "@ecom/prisma";

export class ProvinceRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: number) {
    return this.prisma.province.findFirst({
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
        phoneCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByCode(code: number) {
    return this.prisma.province.findFirst({
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
        phoneCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByName(name: string) {
    return this.prisma.province.findFirst({
      where: {
        name,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        divisionType: true,
        codeName: true,
        phoneCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async list(params: {
    search?: string;
    divisionType?: string;
    skip?: number;
    take?: number;
    orderBy?: "asc" | "desc";
  }) {
    const where: Prisma.ProvinceWhereInput = {
      deletedAt: null,
    };

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
      this.prisma.province.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          divisionType: true,
          codeName: true,
          phoneCode: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: params.skip,
        take: params.take,
        orderBy: {
          code: params.orderBy || "asc",
        },
      }),
      this.prisma.province.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: {
    name: string;
    code: number;
    divisionType: string;
    codeName: string;
    phoneCode: number;
  }) {
    return this.prisma.province.create({
      data,
      select: {
        id: true,
        name: true,
        code: true,
        divisionType: true,
        codeName: true,
        phoneCode: true,
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
      phoneCode?: number;
    },
  ) {
    return this.prisma.province.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        code: true,
        divisionType: true,
        codeName: true,
        phoneCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async softDelete(id: number) {
    return this.prisma.province.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }
}
