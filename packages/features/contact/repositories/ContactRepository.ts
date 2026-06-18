import type { PrismaClient } from "@prisma/client";

type ContactStatus = "new" | "read" | "replied" | "archived";

export class ContactRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMany(options: {
    formSlug?: string;
    status?: ContactStatus;
    page?: number;
    perPage?: number;
  }) {
    const { formSlug, status, page = 1, perPage = 20 } = options;
    const where: Record<string, unknown> = {};
    if (formSlug) where.formSlug = formSlug;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.contactSubmission.findMany({
        where,
        select: {
          id: true,
          formSlug: true,
          name: true,
          email: true,
          phone: true,
          subject: true,
          message: true,
          status: true,
          assigneeId: true,
          repliedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.contactSubmission.count({ where }),
    ]);
    return { items, total, page, perPage };
  }

  async findById(id: number) {
    return this.prisma.contactSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        formSlug: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        metadata: true,
        status: true,
        assigneeId: true,
        assignee: { select: { id: true, name: true } },
        repliedAt: true,
        ipAddress: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(data: {
    formSlug?: string;
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
    metadata?: unknown;
    ipAddress?: string;
  }) {
    return this.prisma.contactSubmission.create({
      data: {
        ...data,
        metadata: data.metadata as Parameters<
          typeof this.prisma.contactSubmission.create
        >[0]["data"]["metadata"],
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  }

  async updateStatus(id: number, status: ContactStatus) {
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
  }

  async assignTo(id: number, assigneeId: number) {
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { assigneeId },
      select: { id: true, assigneeId: true },
    });
  }

  async markReplied(id: number) {
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { status: "replied", repliedAt: new Date() },
      select: { id: true, status: true, repliedAt: true },
    });
  }

  async remove(id: number) {
    return this.prisma.contactSubmission.delete({ where: { id } });
  }

  async countByStatus() {
    const results = await this.prisma.contactSubmission.groupBy({
      by: ["status"],
      _count: true,
    });
    return Object.fromEntries(results.map((r) => [r.status, r._count]));
  }
}
