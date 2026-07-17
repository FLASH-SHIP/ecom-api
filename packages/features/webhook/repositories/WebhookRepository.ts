import type { Prisma, PrismaClient } from "@ecom/prisma";

export interface CreateWebhookInput {
  name: string;
  url: string;
  secret?: string | null;
  events: string[];
  retries?: number;
  timeout?: number;
  ownerId?: string | null;
  ownerType?: string | null;
  apiVersion?: string;
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  secret?: string | null;
  oldSecret?: string | null;
  secretUpdatedAt?: Date | null;
  events?: string[];
  isActive?: boolean;
  retries?: number;
  timeout?: number;
  apiVersion?: string;
}

export class WebhookRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMany(owner?: { ownerId?: string; ownerType?: string }) {
    const where: Prisma.WebhookWhereInput = {};
    if (owner?.ownerId && owner?.ownerType) {
      where.ownerId = owner.ownerId;
      where.ownerType = owner.ownerType;
    }

    return this.prisma.webhook.findMany({
      where,
      select: {
        id: true,
        name: true,
        url: true,
        secret: true,
        oldSecret: true,
        secretUpdatedAt: true,
        events: true,
        isActive: true,
        retries: true,
        timeout: true,
        ownerId: true,
        ownerType: true,
        failureCount: true,
        apiVersion: true,
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
        oldSecret: true,
        secretUpdatedAt: true,
        events: true,
        isActive: true,
        retries: true,
        timeout: true,
        ownerId: true,
        ownerType: true,
        failureCount: true,
        apiVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEvent(event: string, owner?: { ownerId?: string; ownerType?: string }) {
    const where: Prisma.WebhookWhereInput = {
      isActive: true,
      events: { has: event },
    };

    if (owner?.ownerId && owner?.ownerType) {
      where.OR = [
        { ownerId: owner.ownerId, ownerType: owner.ownerType },
        { ownerId: null, ownerType: null },
      ];
    } else {
      where.ownerId = null;
      where.ownerType = null;
    }

    return this.prisma.webhook.findMany({
      where,
      select: {
        id: true,
        url: true,
        secret: true,
        oldSecret: true,
        secretUpdatedAt: true,
        retries: true,
        timeout: true,
        apiVersion: true,
      },
    });
  }

  async create(data: CreateWebhookInput) {
    return this.prisma.webhook.create({
      data,
      select: { id: true, name: true, secret: true },
    });
  }

  async update(id: number, data: UpdateWebhookInput) {
    return this.prisma.webhook.update({
      where: { id },
      data,
      select: { id: true, name: true },
    });
  }

  async remove(id: number) {
    return this.prisma.webhook.delete({ where: { id } });
  }

  async cascadeDeleteOwner(ownerId: string, ownerType: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    await client.webhook.deleteMany({ where: { ownerId, ownerType } });
    await client.apiKey.deleteMany({ where: { ownerId, ownerType } });
  }

  async incrementFailureCount(id: number) {
    return this.prisma.webhook.update({
      where: { id },
      data: { failureCount: { increment: 1 } },
      select: { id: true, failureCount: true, isActive: true },
    });
  }

  async resetFailureCount(id: number) {
    return this.prisma.webhook.update({
      where: { id },
      data: { failureCount: 0 },
      select: { id: true },
    });
  }

  async rotateSecret(id: number, newSecret: string, oldSecret: string | null) {
    return this.prisma.webhook.update({
      where: { id },
      data: {
        secret: newSecret,
        oldSecret: oldSecret,
        secretUpdatedAt: new Date(),
      },
      select: { id: true, secret: true },
    });
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
    const maskedPayload = maskSensitiveData(data.payload);
    let maskedResponse = data.response;

    if (data.response && (data.response.startsWith("{") || data.response.startsWith("["))) {
      try {
        const parsed = JSON.parse(data.response);
        maskedResponse = JSON.stringify(maskSensitiveData(parsed));
      } catch {
        // Fallback if JSON parse fails
      }
    }

    return this.prisma.webhookLog.create({
      data: {
        ...data,
        payload: maskedPayload as Prisma.InputJsonValue,
        response: maskedResponse,
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
        payload: true,
        response: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

function maskStringValue(key: string, value: string): string {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes("phone")) {
    return value.length > 4 ? value.slice(0, -4).replace(/./g, "*") + value.slice(-4) : "****";
  }
  if (lowerKey.includes("email")) {
    const parts = value.split("@");
    if (parts.length === 2 && parts[0] && parts[1]) {
      return `${parts[0].charAt(0)}***@${parts[1]}`;
    }
    return "******";
  }
  if (
    lowerKey.includes("password") ||
    lowerKey.includes("secret") ||
    lowerKey.includes("key") ||
    lowerKey.includes("token") ||
    lowerKey.includes("name") ||
    lowerKey.includes("address")
  ) {
    return "******";
  }
  return value;
}

function maskSensitiveData(data: unknown): unknown {
  if (!data) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value && typeof value === "object") {
      masked[key] = maskSensitiveData(value);
    } else if (typeof value === "string") {
      masked[key] = maskStringValue(key, value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}
