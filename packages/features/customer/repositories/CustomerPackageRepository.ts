import type { PrismaClient } from "@ecom/prisma";

const PACKAGE_SELECT = {
  id: true,
  label: true,
  packageName: true,
  packingTypeId: true,
  length: true,
  width: true,
  height: true,
  weight: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class CustomerPackageRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByCustomerId(customerId: string) {
    return this.prisma.customerPackage.findMany({
      where: { customerId, deletedAt: null },
      select: PACKAGE_SELECT,
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  }

  async findById(id: number) {
    return this.prisma.customerPackage.findFirst({
      where: { id, deletedAt: null },
      select: { ...PACKAGE_SELECT, customerId: true },
    });
  }

  async create(data: {
    customerId: string;
    label?: string | null;
    packageName: string;
    packingTypeId: number;
    length?: number | null;
    width?: number | null;
    height?: number | null;
    weight: number;
    isDefault?: boolean;
  }) {
    return this.prisma.customerPackage.create({
      data,
      select: PACKAGE_SELECT,
    });
  }

  async update(
    id: number,
    data: {
      label?: string | null;
      packageName?: string;
      packingTypeId?: number;
      length?: number | null;
      width?: number | null;
      height?: number | null;
      weight?: number;
      isDefault?: boolean;
    },
  ) {
    return this.prisma.customerPackage.update({
      where: { id },
      data,
      select: PACKAGE_SELECT,
    });
  }

  async softDelete(id: number) {
    return this.prisma.customerPackage.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
      select: { id: true },
    });
  }

  async resetDefault(customerId: string) {
    return this.prisma.customerPackage.updateMany({
      where: { customerId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    });
  }
}
