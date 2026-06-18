import type { PrismaClient } from "@ecom/prisma";

export class WebhookRepository {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMany() {
    return this.prisma.webhook.findMany({
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        retries: true,
        timeout: true,
        createdAt: true,
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: number) {
    return this.prisma.webhook.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        url: true,
        secret: true,
        events: true,
        isActive: true,
        retries: true,
        timeout: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEvent(event: string) {
    return this.prisma.webhook.findMany({
      where: {
        isActive: true,
        events: { has: event },
      },
      select: {
        id: true,
        url: true,
        secret: true,
        retries: true,
        timeout: true,
      },
    });
  }

  async create(data: {
    name: string;
    url: string;
    secret?: string;
    events: string[];
    retries?: number;
    timeout?: number;
  }) {
    return this.prisma.webhook.create({
      data,
      select: { id: true, name: true },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      url?: string;
      secret?: string;
      events?: string[];
      isActive?: boolean;
      retries?: number;
      timeout?: number;
    },
  ) {
    return this.prisma.webhook.update({
      where: { id },
      data,
      select: { id: true, name: true },
    });
  }

  async remove(id: number) {
    return this.prisma.webhook.delete({ where: { id } });
  }

  async createLog(data: {
    webhookId: number;
    event: string;
    payload?: unknown;
    response?: string;
    statusCode?: number;
    success: boolean;
    attempts?: number;
    error?: string;
  }) {
    return this.prisma.webhookLog.create({
      data: {
        ...data,
        payload: data.payload as Parameters<
          typeof this.prisma.webhookLog.create
        >[0]["data"]["payload"],
      },
      select: { id: true },
    });
  }

  async findLogs(webhookId: number, limit = 50) {
    return this.prisma.webhookLog.findMany({
      where: { webhookId },
      select: {
        id: true,
        event: true,
        statusCode: true,
        success: true,
        attempts: true,
        error: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
