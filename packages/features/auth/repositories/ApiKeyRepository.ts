import type { PrismaClient } from "@ecom/prisma";

export interface CreateApiKeyInput {
  ownerId: string;
  ownerType: string;
  hashedKey: string;
  maskedKey: string;
  label?: string | null;
  expiresAt?: Date | null;
  allowedIps?: string[];
}

export class ApiKeyRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findByHashedKey(hashedKey: string) {
    return this.prisma.apiKey.findUnique({
      where: { hashedKey },
      select: {
        id: true,
        ownerId: true,
        ownerType: true,
        maskedKey: true,
        allowedIps: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async findManyByOwner(ownerId: string, ownerType: string) {
    return this.prisma.apiKey.findMany({
      where: {
        ownerId,
        ownerType,
      },
      select: {
        id: true,
        ownerId: true,
        ownerType: true,
        maskedKey: true,
        label: true,
        allowedIps: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async countByOwner(ownerId: string, ownerType: string): Promise<number> {
    return this.prisma.apiKey.count({
      where: {
        ownerId,
        ownerType,
      },
    });
  }

  async create(data: CreateApiKeyInput) {
    return this.prisma.apiKey.create({
      data,
      select: {
        id: true,
        maskedKey: true,
        label: true,
        createdAt: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.apiKey.delete({
      where: { id },
    });
  }

  async updateLastUsed(id: string) {
    return this.prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
      select: { id: true },
    });
  }
}
