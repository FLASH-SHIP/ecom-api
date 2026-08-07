import type {
  ContentStatus,
  PrismaClient,
  RateCardType,
  RateItemType,
  ShippingMethod,
} from "@ecom/prisma";
import { normalizePagination, paginate } from "@flash-ship/ecom-lib/pagination";

export interface CreateRateCardInput {
  code: string;
  name: string;
  type?: RateCardType;
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
  type?: RateCardType;
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

function mapSlabItemToDTO(item: Record<string, unknown>) {
  return {
    ...item,
    ...(item.startWeight != null && { startWeight: Number(item.startWeight) }),
    ...(item.endWeight != null && { endWeight: Number(item.endWeight) }),
    ...(item.amount != null && { amount: Number(item.amount) }),
  };
}

function mapRateCardToDTO<T>(card: T): T {
  if (!card || typeof card !== "object") return card;
  const res = { ...card } as Record<string, unknown>;

  if (res.weightStep != null) res.weightStep = Number(res.weightStep);
  if (res.minWeight != null) res.minWeight = Number(res.minWeight);
  if (res.maxWeight != null) res.maxWeight = Number(res.maxWeight);

  if (Array.isArray(res.items)) {
    res.items = res.items.map((item) =>
      item && typeof item === "object" ? mapSlabItemToDTO(item as Record<string, unknown>) : item,
    );
  }

  return res as T;
}

type FindManyOptions = {
  id?: number;
  code?: string;
  type?: RateCardType;
  status?: ContentStatus;
  shippingMethod?: ShippingMethod;
  country?: string;
  origin?: string;
  search?: string;
  name?: string;
  startDate?: Date;
  startDateGte?: Date;
  startDateLte?: Date;
  endDate?: Date;
  endDateGte?: Date;
  endDateLte?: Date;
  customerGroupId?: number | null;
};

function buildDateCondition(gte?: Date, lte?: Date) {
  if (!gte && !lte) return undefined;
  return {
    ...(gte && { gte }),
    ...(lte && { lte }),
  };
}

function buildCustomerGroupWhereCondition(customerGroupId?: number | null) {
  if (customerGroupId === null || customerGroupId === -1) {
    return { groups: { none: {} } };
  }
  if (customerGroupId && customerGroupId > 0) {
    return { groups: { some: { customerGroupId } } };
  }
  return undefined;
}

function buildRateCardFindManyWhere(options: FindManyOptions) {
  const {
    id,
    code,
    type,
    status,
    shippingMethod,
    country,
    origin,
    name,
    startDate,
    startDateGte,
    startDateLte,
    endDate,
    endDateGte,
    endDateLte,
    customerGroupId,
    search,
  } = options;

  const exactFields = { id, type, status, shippingMethod, country, origin };
  const conditions: Record<string, unknown>[] = Object.entries(exactFields)
    .filter(([, val]) => val !== undefined)
    .map(([key, val]) => ({ [key]: val }));

  if (code) conditions.push({ code: { contains: code, mode: "insensitive" as const } });
  if (name) conditions.push({ name: { contains: name, mode: "insensitive" as const } });

  const startDateCond = buildDateCondition(startDateGte ?? startDate, startDateLte);
  if (startDateCond) conditions.push({ startDate: startDateCond });

  const endDateCond = buildDateCondition(endDateGte, endDateLte ?? endDate);
  if (endDateCond) conditions.push({ endDate: endDateCond });

  const groupCond = buildCustomerGroupWhereCondition(customerGroupId);
  if (groupCond) conditions.push(groupCond);

  if (search?.trim()) {
    const q = search.trim();
    conditions.push({
      OR: [
        { code: { contains: q, mode: "insensitive" as const } },
        { name: { contains: q, mode: "insensitive" as const } },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

type PublishedCardScopeItem = {
  id: number;
  type: RateCardType;
  shippingMethod: ShippingMethod;
  country: string;
  origin: string | null;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  groups: { customerGroupId: number }[];
};

function groupPublishedCardsByScope(cards: PublishedCardScopeItem[]) {
  const groups = new Map<string, PublishedCardScopeItem[]>();
  for (const card of cards) {
    if (card.type === "DEFAULT") {
      const key = `DEFAULT:${card.shippingMethod}:${card.country}:${card.origin ?? ""}`;
      const group = groups.get(key) ?? [];
      group.push(card);
      groups.set(key, group);
    } else if (card.type === "CUSTOM" && card.groups.length > 0) {
      for (const g of card.groups) {
        const key = `CUSTOM:${g.customerGroupId}:${card.shippingMethod}:${card.country}:${card.origin ?? ""}`;
        const group = groups.get(key) ?? [];
        group.push(card);
        groups.set(key, group);
      }
    }
  }
  return groups;
}

function findSupersededInGroup(cards: PublishedCardScopeItem[], now: Date): number[] {
  const effective = cards.filter(
    (c) =>
      (c.startDate === null || new Date(c.startDate) <= now) &&
      (c.endDate === null || new Date(c.endDate) >= now),
  );

  if (effective.length <= 1) return [];

  effective.sort((a, b) => {
    const timeA = (a.startDate ?? a.createdAt).getTime();
    const timeB = (b.startDate ?? b.createdAt).getTime();
    if (timeB !== timeA) return timeB - timeA;
    const createdA = a.createdAt.getTime();
    const createdB = b.createdAt.getTime();
    if (createdB !== createdA) return createdB - createdA;
    return b.id - a.id;
  });

  return effective.slice(1).map((c) => c.id);
}

function buildGroupCondition(type?: RateCardType, customerGroupIds: number[] = []) {
  if (type === "CUSTOM") {
    return { groups: { some: { customerGroupId: { in: customerGroupIds } } } };
  }
  if (type === "DEFAULT") {
    return { groups: { none: {} } };
  }
  if (customerGroupIds.length > 0) {
    return { groups: { some: { customerGroupId: { in: customerGroupIds } } } };
  }
  return {};
}

export class RateCardRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: number) {
    const card = await this.prisma.rateCard.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
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
    return mapRateCardToDTO(card);
  }

  async findByCode(code: string) {
    return this.prisma.rateCard.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
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
    const selectFields = {
      id: true,
      code: true,
      name: true,
      type: true,
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
        orderBy: { startWeight: "asc" as const },
      },
    };

    if (origin !== null) {
      const card = await this.prisma.rateCard.findFirst({
        where: {
          shippingMethod: method,
          country,
          origin,
          type: "CUSTOM" as RateCardType,
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
        select: selectFields,
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      });
      if (card) return mapRateCardToDTO(card);
    }

    const card = await this.prisma.rateCard.findFirst({
      where: {
        shippingMethod: method,
        country,
        origin: null,
        type: "CUSTOM" as RateCardType,
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
      select: selectFields,
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });
    return mapRateCardToDTO(card);
  }

  async findActiveDefault(
    method: ShippingMethod,
    country: string,
    origin: string | null,
    date: Date = new Date(),
  ) {
    const selectFields = {
      id: true,
      code: true,
      name: true,
      type: true,
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
        orderBy: { startWeight: "asc" as const },
      },
    };

    if (origin !== null) {
      const card = await this.prisma.rateCard.findFirst({
        where: {
          shippingMethod: method,
          country,
          origin,
          type: "DEFAULT" as RateCardType,
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
        select: selectFields,
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      });
      if (card) return mapRateCardToDTO(card);
    }

    const card = await this.prisma.rateCard.findFirst({
      where: {
        shippingMethod: method,
        country,
        origin: null,
        type: "DEFAULT" as RateCardType,
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
      select: selectFields,
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });
    return mapRateCardToDTO(card);
  }

  async findMany(options: {
    id?: number;
    code?: string;
    type?: RateCardType;
    status?: ContentStatus;
    shippingMethod?: ShippingMethod;
    country?: string;
    origin?: string;
    search?: string;
    name?: string;
    startDate?: Date;
    startDateGte?: Date;
    startDateLte?: Date;
    endDate?: Date;
    endDateGte?: Date;
    endDateLte?: Date;
    customerGroupId?: number | null;
    page?: number;
    perPage?: number;
    sortBy?:
      | "id"
      | "code"
      | "name"
      | "type"
      | "status"
      | "createdAt"
      | "updatedAt"
      | "startDate"
      | "endDate";
    sortOrder?: "asc" | "desc";
  }) {
    const { sortBy = "createdAt", sortOrder = "desc" } = options;
    const { page, perPage, skip } = normalizePagination(options);
    const where = buildRateCardFindManyWhere(options);

    const [items, total] = await Promise.all([
      this.prisma.rateCard.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
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
      }),
      this.prisma.rateCard.count({ where }),
    ]);

    const mappedItems = items.map((item) => mapRateCardToDTO(item));
    return paginate(mappedItems, total, page, perPage);
  }

  async create(data: CreateRateCardInput) {
    const { customerGroupIds, ...cardData } = data;

    const slabs: { startWeight: number; endWeight: number; rateType: RateItemType; amount: number }[] = [];
    const minW = data.minWeight;
    const maxW = data.maxWeight;
    const step = data.weightStep;

    if (step > 0 && maxW > minW) {
      let curr = Number(minW.toFixed(3));
      const targetMax = Number(maxW.toFixed(3));
      const stepVal = Number(step.toFixed(3));

      while (curr < targetMax) {
        let next = Number((curr + stepVal).toFixed(3));
        if (next > targetMax) next = targetMax;
        slabs.push({
          startWeight: curr,
          endWeight: next,
          rateType: "STEP_FIXED",
          amount: 0,
        });
        curr = next;
      }
    }

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
        ...(slabs.length > 0 && {
          items: {
            create: slabs,
          },
        }),
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
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
          type: true,
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
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
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
          groups: {
            select: { customerGroupId: true },
          },
          items: {
            select: {
              startWeight: true,
              endWeight: true,
              rateType: true,
              amount: true,
            },
          },
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
          type: original.type,
          status: "DRAFT",
          shippingMethod: original.shippingMethod,
          country: original.country,
          origin: original.origin,
          currency: original.currency,
          weightStep: original.weightStep,
          minWeight: original.minWeight,
          maxWeight: original.maxWeight,
          startDate: original.startDate,
          endDate: original.type === "DEFAULT" ? null : original.endDate,
          groups:
            original.groups.length > 0
              ? {
                  create: original.groups.map((g) => ({
                    customerGroupId: g.customerGroupId,
                  })),
                }
              : undefined,
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
          type: true,
        },
      });

      return duplicated;
    });
  }

  // Atomic Transaction for approving Default Rate Card & Archiving Previous Active Default
  async approveDefaultCardTransaction(params: {
    id: number;
    shippingMethod: ShippingMethod;
    country: string;
    origin: string | null;
  }) {
    const { id, shippingMethod, country, origin } = params;
    return this.prisma.$transaction(async (tx) => {
      // 1. Archive previous active DEFAULT rate card
      await tx.rateCard.updateMany({
        where: {
          shippingMethod,
          country,
          origin,
          type: "DEFAULT" as RateCardType,
          status: "PUBLISHED" as ContentStatus,
          id: { not: id },
        },
        data: {
          status: "ARCHIVED" as ContentStatus,
        },
      });

      // 2. Publish the target rate card
      return tx.rateCard.update({
        where: { id },
        data: { status: "PUBLISHED" as ContentStatus },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          status: true,
        },
      });
    });
  }

  // Auto-archive previous active DEFAULT rate card helper
  async archivePreviousActiveDefault(
    shippingMethod: ShippingMethod,
    country: string,
    origin: string | null,
    excludeId?: number,
  ) {
    return this.prisma.rateCard.updateMany({
      where: {
        shippingMethod,
        country,
        origin,
        type: "DEFAULT" as RateCardType,
        status: "PUBLISHED" as ContentStatus,
        id: excludeId ? { not: excludeId } : undefined,
      },
      data: {
        status: "ARCHIVED" as ContentStatus,
      },
    });
  }

  /**
   * Scans all PUBLISHED rate cards (both DEFAULT and CUSTOM) and archives those that:
   * 1. Have expired (endDate < now).
   * 2. Have been superseded by a newer effective rate card for the same target scope.
   */
  async archiveSupersededDefaultRateCards(now: Date = new Date()): Promise<{
    archivedCount: number;
    archivedIds: number[];
  }> {
    const publishedCards = await this.prisma.rateCard.findMany({
      where: {
        status: "PUBLISHED" as ContentStatus,
      },
      select: {
        id: true,
        type: true,
        shippingMethod: true,
        country: true,
        origin: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        groups: {
          select: {
            customerGroupId: true,
          },
        },
      },
    });

    if (publishedCards.length === 0) {
      return { archivedCount: 0, archivedIds: [] };
    }

    const idsToArchiveSet = new Set<number>();

    for (const card of publishedCards) {
      if (card.endDate && new Date(card.endDate) < now) {
        idsToArchiveSet.add(card.id);
      }
    }

    const groups = groupPublishedCardsByScope(publishedCards);
    for (const [, cards] of groups) {
      for (const id of findSupersededInGroup(cards, now)) {
        idsToArchiveSet.add(id);
      }
    }

    const idsToArchive = Array.from(idsToArchiveSet);

    if (idsToArchive.length === 0) {
      return { archivedCount: 0, archivedIds: [] };
    }

    await this.prisma.rateCard.updateMany({
      where: {
        id: { in: idsToArchive },
      },
      data: {
        status: "ARCHIVED" as ContentStatus,
      },
    });

    await this.writeAutoArchiveAuditLogs(idsToArchive, now);

    return {
      archivedCount: idsToArchive.length,
      archivedIds: idsToArchive,
    };
  }

  private async writeAutoArchiveAuditLogs(idsToArchive: number[], now: Date) {
    try {
      await this.prisma.auditLog.createMany({
        data: idsToArchive.map((cardId) => ({
          userId: null,
          action: "AUTO_ARCHIVE_SUPERSEDED",
          module: "rateCards",
          entityId: String(cardId),
          entityType: "RateCard",
          oldValues: { status: "PUBLISHED" },
          newValues: { status: "ARCHIVED" },
          metadata: {
            source: "cronjob",
            reason: "Superseded or expired rate card moved to ARCHIVED",
            processedAt: now.toISOString(),
          },
        })),
      });
    } catch (err) {
      console.error("Failed to write audit logs for auto-archived rate cards", err);
    }
  }

  // Slabs bulk replacement within a transaction
  async replaceSlabs(
    rateCardId: number,
    slabs: {
      startWeight: number;
      endWeight: number;
      rateType: RateItemType;
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
    type?: RateCardType;
    shippingMethod: ShippingMethod;
    country: string;
    origin: string | null;
    customerGroupIds?: number[];
    startDate?: Date | null;
    endDate?: Date | null;
  }) {
    const {
      excludeId,
      type,
      shippingMethod,
      country,
      origin,
      customerGroupIds = [],
      startDate,
      endDate,
    } = params;

    if (type === "DEFAULT") {
      return [];
    }

    if (type === "CUSTOM" && customerGroupIds.length === 0) {
      return [];
    }

    const typeCondition = type ? { type } : {};
    const groupCondition = buildGroupCondition(type, customerGroupIds);

    const startLimit = startDate ?? new Date(0);
    const endLimit = endDate ?? new Date(253402300799000);

    const conditions: Record<string, unknown>[] = [
      { id: excludeId ? { not: excludeId } : undefined },
      { shippingMethod },
      { country },
      { origin },
      { status: "PUBLISHED" as ContentStatus },
      typeCondition,
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

    return cards.filter((card) => {
      const cardStart = card.startDate ?? new Date(0);
      const cardEnd = card.endDate ?? new Date(253402300799000);
      return startLimit <= cardEnd && endLimit >= cardStart;
    });
  }
}
