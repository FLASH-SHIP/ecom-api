import { prisma } from "@ecom/prisma";

export class DeviceTokenRepository {
  /**
   * Upserts a device token, enforcing that the token is unique and re-assigning it if it already exists.
   */
  async upsertToken(
    data: {
      userId?: string | null;
      customerId?: string | null;
      token: string;
      platform: string;
      deviceInfo?: string | null;
    },
    maxTokens = 10,
  ) {
    // 1. Remove the token if it is already registered to anyone else to prevent duplicate pushes
    await prisma.deviceToken.deleteMany({
      where: { token: data.token },
    });

    // 2. Insert new token linkage
    const newToken = await prisma.deviceToken.create({
      data: {
        token: data.token,
        platform: data.platform,
        deviceInfo: data.deviceInfo || null,
        userId: data.userId || null,
        customerId: data.customerId || null,
      },
    });

    // 3. Keep only the latest `maxTokens` tokens for this owner
    if (data.userId || data.customerId) {
      const ownerWhere: { userId: string } | { customerId: string } = data.userId
        ? { userId: data.userId }
        : { customerId: data.customerId as string };

      const tokens = await prisma.deviceToken.findMany({
        where: ownerWhere,
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });

      if (tokens.length > maxTokens) {
        const keepIds = tokens.slice(0, maxTokens).map((t) => t.id);
        await prisma.deviceToken.deleteMany({
          where: {
            AND: [ownerWhere, { id: { notIn: keepIds } }],
          },
        });
      }
    }

    return newToken;
  }

  async deleteToken(token: string) {
    return prisma.deviceToken.deleteMany({
      where: { token },
    });
  }

  async findByOwner(params: { userId?: string; customerId?: string }) {
    return prisma.deviceToken.findMany({
      where: {
        OR: [
          params.userId ? { userId: params.userId } : {},
          params.customerId ? { customerId: params.customerId } : {},
        ],
      },
      select: {
        token: true,
        platform: true,
      },
    });
  }

  async deleteMany(tokens: string[]) {
    return prisma.deviceToken.deleteMany({
      where: {
        token: { in: tokens },
      },
    });
  }

  async deleteInactiveSince(date: Date) {
    return prisma.deviceToken.deleteMany({
      where: {
        updatedAt: { lt: date },
      },
    });
  }
}
