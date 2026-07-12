import { normalizePagination, paginate } from "@ecom/lib/pagination";
import type { ContentStatus, PrismaClient, RateCardType, ShippingMethod } from "@ecom/prisma";

export interface CreateRateCardInput {
  code: string;
  name: string;
  status?: ContentStatus;
  shippingMethod: ShippingMethod;
  country?: string;
  origin?: string | null;
  currency?: string;
  weightStep: number;
  minWeight: number;
  maxWeight: number;
  startDate?: Date | null;
  endDate?: Date | null;
  customerGroupIds?: number[];
}

export interface UpdateRateCardInput {
  code?: string;
  name?: string;
  status?: ContentStatus;
  shippingMethod?: ShippingMethod;
  country?: string;
  origin?: string | null;
  currency?: string;
  weightStep?: number;
  minWeight?: number;
  maxWeight?: number;
  startDate?: Date | null;
  endDate?: Date | null;
  customerGroupIds?: number[];
}

export class RateCardRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: number) {
    return this.prisma.rateCard.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        shippingMethod: true,
        country: true,
        origin: true,
        currency: true,
        weightStep: true,
        minWeight: true,
        maxWeight: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        groups: {
          select: {
            customerGroupId: true,
            customerGroup: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        items: {
          select: {
            id: true,
            startWeight: true,
            endWeight: true,
            rateType: true,
            amount: true,
          },
          orderBy: { startWeight: "asc" },
        },
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.rateCard.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
    });
  }

  async findActiveByGroup(
    method: ShippingMethod,
    country: string,
    origin: string | null,
    customerGroupId: number,
    date: Date = new Date(),
  ) {
    if (origin !== null) {
      const card = await this.prisma.rateCard.findFirst({
        where: {
          shippingMethod: method,
          country,
          origin,
          status: "PUBLISHED" as ContentStatus,
          groups: {
            some: { customerGroupId },
          },
          OR: [
            { startDate: null, endDate: null },
            { startDate: { lte: date }, endDate: null },
            { startDate: null, endDate: { gte: date } },
            { startDate: { lte: date }, endDate: { gte: date } },
          ],
        },
        select: {
          id: true,
          code: true,
          name: true,
          shippingMethod: true,
          country: true,
          origin: true,
          currency: true,
          weightStep: true,
          minWeight: true,
          maxWeight: true,
          items: {
            select: {
              id: true,
              startWeight: true,
              endWeight: true,
              rateType: true,
              amount: true,
            },
            orderBy: { startWeight: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      if (card) return card;
    }

    return this.prisma.rateCard.findFirst({
      where: {
        shippingMethod: method,
        country,
        origin: null,
        status: "PUBLISHED" as ContentStatus,
        groups: {
          some: { customerGroupId },
        },
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: date }, endDate: null },
          { startDate: null, endDate: { gte: date } },
          { startDate: { lte: date }, endDate: { gte: date } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        shippingMethod: true,
        country: true,
        origin: true,
        currency: true,
        weightStep: true,
        minWeight: true,
        maxWeight: true,
        items: {
          select: {
            id: true,
            startWeight: true,
            endWeight: true,
            rateType: true,
            amount: true,
          },
          orderBy: { startWeight: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findActiveDefault(
    method: ShippingMethod,
    country: string,
    origin: string | null,
    date: Date = new Date(),
  ) {
    if (origin !== null) {
      const card = await this.prisma.rateCard.findFirst({
        where: {
          shippingMethod: method,
          country,
          origin,
          status: "PUBLISHED" as ContentStatus,
          groups: {
            none: {},
          },
          OR: [
            { startDate: null, endDate: null },
            { startDate: { lte: date }, endDate: null },
            { startDate: null, endDate: { gte: date } },
            { startDate: { lte: date }, endDate: { gte: date } },
          ],
        },
        select: {
          id: true,
          code: true,
          name: true,
          shippingMethod: true,
          country: true,
          origin: true,
          currency: true,
          weightStep: true,
          minWeight: true,
          maxWeight: true,
          items: {
            select: {
              id: true,
              startWeight: true,
              endWeight: true,
              rateType: true,
              amount: true,
            },
            orderBy: { startWeight: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      if (card) return card;
    }

    return this.prisma.rateCard.findFirst({
      where: {
        shippingMethod: method,
        country,
        origin: null,
        status: "PUBLISHED" as ContentStatus,
        groups: {
          none: {},
        },
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: date }, endDate: null },
          { startDate: null, endDate: { gte: date } },
          { startDate: { lte: date }, endDate: { gte: date } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        shippingMethod: true,
        country: true,
        origin: true,
        currency: true,
        weightStep: true,
        minWeight: true,
        maxWeight: true,
        items: {
          select: {
            id: true,
            startWeight: true,
            endWeight: true,
            rateType: true,
            amount: true,
          },
          orderBy: { startWeight: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findMany(options: {
    id?: number;
    code?: string;
    status?: ContentStatus;
    shippingMethod?: ShippingMethod;
    country?: string;
    origin?: string;
    search?: string;
    name?: string;
    startDate?: Date;
    endDate?: Date;
    customerGroupId?: number;
    page?: number;
    perPage?: number;
    sortBy?:
      | "id"
      | "code"
      | "name"
      | "status"
      | "createdAt"
      | "updatedAt"
      | "startDate"
      | "endDate";
    sortOrder?: "asc" | "desc";
  }) {
    const {
      id,
      code,
      status,
      shippingMethod,
      country,
      origin,
      search,
      name,
      startDate,
      endDate,
      customerGroupId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const { page, perPage, skip } = normalizePagination(options);

    const conditions: Record<string, unknown>[] = [];

    if (id) conditions.push({ id });
    if (code) conditions.push({ code: { contains: code, mode: "insensitive" as const } });
    if (status) conditions.push({ status });
    if (shippingMethod) conditions.push({ shippingMethod });
    if (country) conditions.push({ country });
    if (origin) conditions.push({ origin });
    if (name) conditions.push({ name: { contains: name, mode: "insensitive" as const } });
    if (startDate) conditions.push({ startDate: { gte: startDate } });
    if (endDate) conditions.push({ endDate: { lte: endDate } });
    if (customerGroupId) {
      conditions.push({
        groups: {
          some: {
            customerGroupId,
          },
        },
      });
    }

    if (search?.trim()) {
      conditions.push({
        OR: [
          { code: { contains: search.trim(), mode: "insensitive" as const } },
          { name: { contains: search.trim(), mode: "insensitive" as const } },
        ],
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [items, total] = await Promise.all([
      this.prisma.rateCard.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          shippingMethod: true,
          country: true,
          origin: true,
          currency: true,
          weightStep: true,
          minWeight: true,
          maxWeight: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
          groups: {
            select: {
              customerGroupId: true,
              customerGroup: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: perPage,
      }),
      this.prisma.rateCard.count({ where }),
    ]);

    return paginate(items, total, page, perPage);
  }

  async create(data: CreateRateCardInput) {
    const { customerGroupIds, ...cardData } = data;

    return this.prisma.rateCard.create({
      data: {
        ...cardData,
        ...(customerGroupIds?.length && {
          groups: {
            create: customerGroupIds.map((customerGroupId) => ({
              customerGroupId,
            })),
          },
        }),
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
      },
    });
  }

  async update(id: number, data: UpdateRateCardInput) {
    const { customerGroupIds, ...cardData } = data;

    return this.prisma.$transaction(async (tx) => {
      if (customerGroupIds !== undefined) {
        // Re-align group mappings
        await tx.rateCardGroup.deleteMany({ where: { rateCardId: id } });
        if (customerGroupIds.length > 0) {
          await tx.rateCardGroup.createMany({
            data: customerGroupIds.map((customerGroupId) => ({
              rateCardId: id,
              customerGroupId,
            })),
          });
        }
      }

      return tx.rateCard.update({
        where: { id },
        data: cardData,
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
        },
      });
    });
  }

  async delete(id: number) {
    return this.prisma.rateCard.delete({
      where: { id },
      select: { id: true },
    });
  }

  async duplicate(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.rateCard.findUnique({
        where: { id },
        include: {
          groups: true,
          items: true,
        },
      });
      if (!original) return null;

      const baseCode = `${original.code}_copy`;
      let code = baseCode;
      let count = 1;
      while ((await tx.rateCard.count({ where: { code } })) > 0) {
        code = `${baseCode}_${count}`;
        count++;
      }

      const baseName = `${original.name} (Copy)`;
      let name = baseName;
      let nameCount = 1;
      while ((await tx.rateCard.count({ where: { name } })) > 0) {
        name = `${baseName} (${nameCount})`;
        nameCount++;
      }

      const duplicated = await tx.rateCard.create({
        data: {
          code,
          name,
          status: "DRAFT",
          shippingMethod: original.shippingMethod,
          country: original.country,
          origin: original.origin,
          currency: original.currency,
          weightStep: original.weightStep,
          minWeight: original.minWeight,
          maxWeight: original.maxWeight,
          startDate: original.startDate,
          endDate: original.endDate,
          groups: {
            create: original.groups.map((g) => ({
              customerGroupId: g.customerGroupId,
            })),
          },
          items: {
            create: original.items.map((item) => ({
              startWeight: item.startWeight,
              endWeight: item.endWeight,
              rateType: item.rateType,
              amount: item.amount,
            })),
          },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

      return duplicated;
    });
  }

  // Slabs bulk replacement within a transaction
  async replaceSlabs(
    rateCardId: number,
    slabs: {
      startWeight: number;
      endWeight: number;
      rateType: RateCardType;
      amount: number;
    }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.rateCardItem.deleteMany({ where: { rateCardId } });
      if (slabs.length > 0) {
        await tx.rateCardItem.createMany({
          data: slabs.map((s) => ({
            rateCardId,
            startWeight: s.startWeight,
            endWeight: s.endWeight,
            rateType: s.rateType,
            amount: s.amount,
          })),
        });
      }
    });
  }

  async findCustomerGroupIdByCustomerId(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { groupId: true },
    });
    return customer?.groupId ?? null;
  }

  // Audit Logs query helper
  async findAuditLogs(rateCardId: number) {
    // Queries global AuditLog table
    return this.prisma.auditLog.findMany({
      where: {
        entityType: "RateCard",
        entityId: String(rateCardId),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        oldValues: true,
        newValues: true,
        userId: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // Find other published rate cards that could overlap
  async findOverlappingRateCards(params: {
    excludeId?: number;
    shippingMethod: ShippingMethod;
    country: string;
    origin: string | null;
    customerGroupIds: number[];
    startDate?: Date | null;
    endDate?: Date | null;
  }) {
    const { excludeId, shippingMethod, country, origin, customerGroupIds, startDate, endDate } =
      params;

    const groupCondition =
      customerGroupIds.length > 0
        ? { groups: { some: { customerGroupId: { in: customerGroupIds } } } }
        : { groups: { none: {} } };

    // Standard time overlap query:
    // (StartA <= EndB) AND (EndA >= StartB)
    // When date is null, treat null as infinity.
    // If startDate/endDate is null, it is unbounded.
    const startLimit = startDate ?? new Date(0); // Epoch start
    const endLimit = endDate ?? new Date(253402300799000); // Year 9999 end

    const conditions: Record<string, unknown>[] = [
      { id: excludeId ? { not: excludeId } : undefined },
      { shippingMethod },
      { country },
      { origin },
      { status: "PUBLISHED" as ContentStatus },
      groupCondition,
    ].filter((c) => Object.values(c)[0] !== undefined) as Record<string, unknown>[];

    const cards = await this.prisma.rateCard.findMany({
      where: {
        AND: conditions,
      },
      select: {
        id: true,
        code: true,
        startDate: true,
        endDate: true,
      },
    });

    // Filtering memory-side is cleaner for Postgres nullable datetime range intersections:
    return cards.filter((card) => {
      const cardStart = card.startDate ?? new Date(0);
      const cardEnd = card.endDate ?? new Date(253402300799000);
      return startLimit <= cardEnd && endLimit >= cardStart;
    });
  }
}
