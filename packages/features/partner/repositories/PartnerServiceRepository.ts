import type { PrismaClient } from "@ecom/prisma";
import { Prisma, type ServiceType } from "@ecom/prisma";

export interface CreatePartnerServiceInput {
  partnerId: number;
  code: string;
  name: string;
  type: ServiceType;
  apiConfig?: Prisma.InputJsonValue | null;
  statusMapping?: Prisma.InputJsonValue | null;
  isSandbox?: boolean;
  isActive?: boolean;
  webhookSecret?: string | null;
  timeoutMs?: number;
  rateLimitPerMinute?: number;
}

export interface UpdatePartnerServiceInput {
  code?: string;
  name?: string;
  type?: ServiceType;
  apiConfig?: Prisma.InputJsonValue | null;
  statusMapping?: Prisma.InputJsonValue | null;
  isSandbox?: boolean;
  isActive?: boolean;
  webhookSecret?: string | null;
  timeoutMs?: number;
  rateLimitPerMinute?: number;
}

export class PartnerServiceRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: string) {
    return this.prisma.partnerService.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        partnerId: true,
        code: true,
        name: true,
        type: true,
        apiConfig: true,
        statusMapping: true,
        isSandbox: true,
        isActive: true,
        webhookSecret: true,
        timeoutMs: true,
        rateLimitPerMinute: true,
        createdAt: true,
        updatedAt: true,
        partner: {
          select: { id: true, code: true, name: true },
        },
      },
    });
  }

  async findManyByPartnerId(partnerId: number) {
    return this.prisma.partnerService.findMany({
      where: { partnerId, deletedAt: null },
      select: {
        id: true,
        partnerId: true,
        code: true,
        name: true,
        type: true,
        apiConfig: true,
        statusMapping: true,
        isSandbox: true,
        isActive: true,
        webhookSecret: true,
        timeoutMs: true,
        rateLimitPerMinute: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async findByCode(partnerId: number, code: string) {
    return this.prisma.partnerService.findFirst({
      where: { partnerId, code, deletedAt: null },
      select: {
        id: true,
        partnerId: true,
        code: true,
        name: true,
      },
    });
  }

  async create(data: CreatePartnerServiceInput) {
    return this.prisma.partnerService.create({
      data: {
        ...data,
        apiConfig: data.apiConfig === null ? Prisma.DbNull : data.apiConfig,
        statusMapping: data.statusMapping === null ? Prisma.DbNull : data.statusMapping,
      },
      select: {
        id: true,
        partnerId: true,
        code: true,
        name: true,
      },
    });
  }

  async update(id: string, data: UpdatePartnerServiceInput) {
    return this.prisma.partnerService.update({
      where: { id },
      data: {
        ...data,
        apiConfig: data.apiConfig === null ? Prisma.DbNull : data.apiConfig,
        statusMapping: data.statusMapping === null ? Prisma.DbNull : data.statusMapping,
      },
      select: {
        id: true,
        partnerId: true,
        code: true,
        name: true,
      },
    });
  }

  async delete(id: string) {
    const service = await this.prisma.partnerService.findFirst({
      where: { id, deletedAt: null },
      select: { code: true, partnerId: true },
    });

    if (!service) return null;

    const deletedSuffix = `_deleted_${Date.now()}`;
    const newCode = service.code.slice(0, 100 - deletedSuffix.length) + deletedSuffix;

    return this.prisma.partnerService.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        code: newCode, // free up code constraint
      },
      select: { id: true },
    });
  }
}
