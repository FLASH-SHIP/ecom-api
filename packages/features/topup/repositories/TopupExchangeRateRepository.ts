import { Prisma, TopupContentStatus, type PrismaClient } from "@ecom/prisma";

export class TopupExchangeRateRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get latest active exchange rate
   */
  async getLatestExchangeRate() {
    return this.prisma.topupExchangeRateManagement.findFirst({
      where: {
        status: TopupContentStatus.PUBLISHED,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Create new exchange rate
   */
  async createExchangeRate(data: { rate: number; note?: string; createdBy?: string }) {
    return this.prisma.topupExchangeRateManagement.create({
      data: {
        rate: new Prisma.Decimal(data.rate),
        note: data.note ?? null,
        createdBy: data.createdBy ?? null,
        status: TopupContentStatus.PUBLISHED,
      },
    });
  }
}
