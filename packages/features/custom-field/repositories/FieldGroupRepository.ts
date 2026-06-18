import type { PrismaClient } from "@ecom/prisma";
import { Prisma } from "@ecom/prisma";

export interface FindGroupsOpts {
  // ── Filter ────────────────────────────────────────────────────────────────
  /** Pre-built Prisma where clause from buildPrismaWhere */
  where?: Record<string, unknown>;
  /** Case-insensitive CONTAINS on title (from search bar, separate from column filters) */
  search?: string;
  /** Legacy: exact status for getFieldsForContext */
  status?: string;
  // ── Sort ──────────────────────────────────────────────────────────────────
  sortBy?: "id" | "title" | "createdAt" | "status";
  sortDir?: "asc" | "desc";
  // ── Pagination ────────────────────────────────────────────────────────────
  page?: number;
  pageSize?: number;
}

export class FieldGroupRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private buildWhere(opts: FindGroupsOpts): Prisma.FieldGroupWhereInput {
    const conditions: Prisma.FieldGroupWhereInput[] = [];

    // Merge pre-built where clause from generic filter engine
    if (opts.where && Object.keys(opts.where).length > 0) {
      conditions.push(opts.where as Prisma.FieldGroupWhereInput);
    }

    // Legacy status filter (used by getFieldsForContext)
    if (opts.status) {
      conditions.push({ status: opts.status });
    }

    // Global search bar (separate from column-level filters)
    if (opts.search?.trim()) {
      conditions.push({
        title: { contains: opts.search.trim(), mode: "insensitive" },
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  private buildOrderBy(opts: FindGroupsOpts): Prisma.FieldGroupOrderByWithRelationInput[] {
    if (opts.sortBy && opts.sortDir) {
      return [{ [opts.sortBy]: opts.sortDir }];
    }
    return [{ order: "asc" }, { createdAt: "desc" }];
  }

  async findMany(opts: FindGroupsOpts = {}) {
    const where = this.buildWhere(opts);
    const orderBy = this.buildOrderBy(opts);

    const page = opts.page ?? 1;
    const pageSize = opts.pageSize;
    const skip = pageSize ? (page - 1) * pageSize : undefined;
    const take = pageSize;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fieldGroup.findMany({
        where,
        select: {
          id: true,
          title: true,
          order: true,
          rules: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { items: true } },
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.fieldGroup.count({ where }),
    ]);

    return { rows, total };
  }

  async findById(id: number) {
    return this.prisma.fieldGroup.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        order: true,
        rules: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            slug: true,
            title: true,
            type: true,
            placeholder: true,
            instructions: true,
            options: true,
            defaultValue: true,
            order: true,
            parentId: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  /** Batch fetch multiple groups with full items — avoids N+1 in getFieldBoxes */
  async findManyByIds(ids: number[]) {
    if (ids.length === 0) return [];
    return this.prisma.fieldGroup.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        title: true,
        order: true,
        rules: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            slug: true,
            title: true,
            type: true,
            placeholder: true,
            instructions: true,
            options: true,
            defaultValue: true,
            order: true,
            parentId: true,
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
  }

  async create(data: { title: string; order?: number; rules?: unknown; status?: string }) {
    return this.prisma.fieldGroup.create({
      data: {
        title: data.title,
        order: data.order ?? 0,
        rules: (data.rules ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        status: data.status ?? "published",
      },
      select: { id: true, title: true },
    });
  }

  async update(
    id: number,
    data: { title?: string; order?: number; rules?: unknown; status?: string },
  ) {
    const { rules, ...rest } = data;
    const updateData: Record<string, unknown> = { ...rest };
    if (rules !== undefined) {
      updateData.rules = rules as Prisma.InputJsonValue;
    }
    return this.prisma.fieldGroup.update({
      where: { id },
      data: updateData,
      select: { id: true, title: true },
    });
  }

  async remove(id: number) {
    return this.prisma.fieldGroup.delete({ where: { id } });
  }
}
