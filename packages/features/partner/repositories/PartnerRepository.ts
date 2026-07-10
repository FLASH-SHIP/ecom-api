import { normalizePagination, paginate } from "@ecom/lib/pagination";
import type { PartnerStatus, PrismaClient } from "@ecom/prisma";

export interface CreatePartnerInput {
  code: string;
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: PartnerStatus;
  description?: string | null;
}

export interface UpdatePartnerInput {
  code?: string;
  name?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: PartnerStatus;
  description?: string | null;
}

export class PartnerRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: number) {
    return this.prisma.partner.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        status: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.partner.findFirst({
      where: { code, deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
    });
  }

  async findMany(options: {
    search?: string;
    status?: PartnerStatus;
    page?: number;
    perPage?: number;
    sortBy?: "id" | "code" | "name" | "status" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
  }) {
    const { search, status, sortBy = "createdAt", sortOrder = "desc" } = options;
    const { page, perPage, skip } = normalizePagination(options);

    const conditions: Record<string, unknown>[] = [{ deletedAt: null }];

    if (status) {
      conditions.push({ status });
    }

    if (search?.trim()) {
      conditions.push({
        OR: [
          { code: { contains: search.trim(), mode: "insensitive" as const } },
          { name: { contains: search.trim(), mode: "insensitive" as const } },
          { contactName: { contains: search.trim(), mode: "insensitive" as const } },
          { contactEmail: { contains: search.trim(), mode: "insensitive" as const } },
        ],
      });
    }

    const where = { AND: conditions };

    const [items, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          status: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: perPage,
      }),
      this.prisma.partner.count({ where }),
    ]);

    return paginate(items, total, page, perPage);
  }

  async create(data: CreatePartnerInput) {
    return this.prisma.partner.create({
      data,
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
    });
  }

  async update(id: number, data: UpdatePartnerInput) {
    return this.prisma.partner.update({
      where: { id },
      data,
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
    });
  }

  async delete(id: number) {
    // Soft delete: set deletedAt, and modify unique constraint fields if needed (e.g. append timestamp to code to prevent reuse collision if re-created)
    const partner = await this.prisma.partner.findFirst({
      where: { id, deletedAt: null },
      select: { code: true },
    });

    if (!partner) return null;

    const deletedSuffix = `_deleted_${Date.now()}`;
    const newCode = partner.code.slice(0, 100 - deletedSuffix.length) + deletedSuffix;

    return this.prisma.partner.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        code: newCode, // free up the original code for future creation
      },
      select: { id: true },
    });
  }
}
