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
   * Get exchange rate by specified date (or latest)
   */
  async getExchangeRateByDate(date?: Date) {
    if (!date) {
      return this.getLatestExchangeRate();
    }
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    const item = await this.prisma.topupExchangeRateManagement.findFirst({
      where: {
        status: TopupContentStatus.PUBLISHED,
        deletedAt: null,
        createdAt: {
          lte: endOfDay,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return item ?? this.getLatestExchangeRate();
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
