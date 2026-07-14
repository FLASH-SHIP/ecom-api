import type { Prisma, PrismaClient } from "@ecom/prisma";

export class AdministrativeDivisionRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: number) {
    return this.prisma.administrativeDivision.findFirst({
      where: { id },
      select: {
        id: true,
        countryCode: true,
        code: true,
        name: true,
        nameEn: true,
        divisionType: true,
        level: true,
        parentId: true,
        isActive: true,
        parent: {
          select: { id: true, name: true, code: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByCountryAndCode(countryCode: string, code: string) {
    return this.prisma.administrativeDivision.findUnique({
      where: { countryCode_code: { countryCode, code } },
      select: {
        id: true,
        countryCode: true,
        code: true,
        name: true,
        nameEn: true,
        divisionType: true,
        level: true,
        parentId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async list(params: {
    countryCode: string;
    level?: number;
    parentId?: number;
    search?: string;
    skip?: number;
    take?: number;
    orderBy?: "asc" | "desc";
  }) {
    const where: Prisma.AdministrativeDivisionWhereInput = {
      countryCode: params.countryCode,
    };

    if (params.level !== undefined) {
      where.level = params.level;
    }

    if (params.parentId !== undefined) {
      where.parentId = params.parentId;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { code: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.administrativeDivision.findMany({
        where,
        select: {
          id: true,
          countryCode: true,
          code: true,
          name: true,
          nameEn: true,
          divisionType: true,
          level: true,
          parentId: true,
          isActive: true,
          parent: {
            select: { id: true, name: true, code: true },
          },
          createdAt: true,
          updatedAt: true,
        },
        skip: params.skip,
        take: params.take,
        orderBy: {
          name: params.orderBy || "asc",
        },
      }),
      this.prisma.administrativeDivision.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: {
    countryCode: string;
    code: string;
    name: string;
    nameEn?: string;
    divisionType: string;
    level: number;
    parentId?: number;
  }) {
    return this.prisma.administrativeDivision.create({
      data,
      select: {
        id: true,
        countryCode: true,
        code: true,
        name: true,
        nameEn: true,
        divisionType: true,
        level: true,
        parentId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      nameEn?: string;
      divisionType?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.administrativeDivision.update({
      where: { id },
      data,
      select: {
        id: true,
        countryCode: true,
        code: true,
        name: true,
        nameEn: true,
        divisionType: true,
        level: true,
        parentId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
