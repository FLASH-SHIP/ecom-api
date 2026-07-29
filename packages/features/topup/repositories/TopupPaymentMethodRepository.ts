import { TopupContentStatus, type PrismaClient } from "@ecom/prisma";

export class TopupPaymentMethodRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get list of payment methods assigned to a specific customer.
   * If customer has specific partner relations, return assigned active methods.
   * Fallback to all active payment methods if no specific relations defined.
   */
  async getPaymentMethodsForCustomer(customerId: string) {
    // Check if customer has specific partner relations
    const relations = await this.prisma.topupPaymentMethodPartnerRelation.findMany({
      where: {
        customerId,
        status: TopupContentStatus.PUBLISHED,
        deletedAt: null,
        paymentMethod: {
          status: TopupContentStatus.PUBLISHED,
          deletedAt: null,
        },
      },
      include: {
        paymentMethod: true,
      },
      orderBy: {
        paymentMethod: {
          position: "asc",
        },
      },
    });

    if (relations.length > 0) {
      return relations.map((rel) => rel.paymentMethod);
    }

    // Fallback: return all active payment methods
    return this.prisma.topupPaymentMethod.findMany({
      where: {
        status: TopupContentStatus.PUBLISHED,
        deletedAt: null,
      },
      orderBy: [
        { position: "asc" },
        { createdAt: "desc" },
      ],
    });
  }

  async findById(id: number) {
    return this.prisma.topupPaymentMethod.findFirst({
      where: {
        id,
        status: TopupContentStatus.PUBLISHED,
        deletedAt: null,
      },
    });
  }
}
