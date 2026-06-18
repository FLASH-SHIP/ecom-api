import type { PrismaClient } from "@ecom/prisma";

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
        userId: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
          },
        },
      },
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
