import { Prisma, TopupType, type PrismaClient } from "@ecom/prisma";

export interface FilterTopupHistoryParams {
  customerId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  paymentMethodId?: number;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class TopupTransactionRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get customerCode by customerId
   */
  async getCustomerCode(customerId: string): Promise<string> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { customerCode: true, username: true },
    });
    return customer?.customerCode || customer?.username || customerId;
  }

  /**
   * Get wallet summary for logged in customer:
   * 1. accountBalance: Current available balance (from latest transaction or 0.00)
   * 2. waitingConfirmTopup: Sum of wireAmount for all WAITING status transactions
   */
  async getWalletSummary(customerId: string) {
    // 1. Get latest transaction balance
    const latestTx = await this.prisma.topupTransaction.findFirst({
      where: {
        customerId,
        status: 2, // 2 = Confirmed/Approved
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        accountBalanceAfter: true,
      },
    });

    const accountBalance = latestTx?.accountBalanceAfter
      ? Number(latestTx.accountBalanceAfter)
      : 0.0;

    // 2. Sum wireAmount of transactions with status 1 (Created/Waiting)
    const waitingAggregate = await this.prisma.topupTransaction.aggregate({
      where: {
        customerId,
        status: 1, // 1 = Created/Waiting
      },
      _sum: {
        wireAmount: true,
      },
    });

    const waitingConfirmTopup = waitingAggregate._sum.wireAmount
      ? Number(waitingAggregate._sum.wireAmount)
      : 0.0;

    return {
      accountBalance,
      waitingConfirmTopup,
    };
  }

  /**
   * Get paginated top-up transaction history for customer.
   * Default filter: last 7 days from current date if no date range supplied.
   * Default pagination: page 1, pageSize 10.
   */
  async getTopupHistory(params: FilterTopupHistoryParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 10;
    const skip = (page - 1) * pageSize;

    // Build default 7 days date range if not specified
    let fromDate = params.dateFrom;
    let toDate = params.dateTo;

    if (!fromDate && !toDate) {
      const now = new Date();
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      fromDate = sevenDaysAgo;
    }

    const where: Prisma.TopupTransactionWhereInput = {
      customerId: params.customerId, // Strict Customer Isolation
    };

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = fromDate;
      }
      if (toDate) {
        where.createdAt.lte = toDate;
      }
    }

    if (params.status && params.status !== "ALL") {
      const statusNum = Number.parseInt(params.status, 10);
      if (!Number.isNaN(statusNum)) {
        where.status = statusNum;
      }
    }

    if (params.paymentMethodId) {
      where.paymentMethodId = params.paymentMethodId;
    }

    if (params.search && params.search.trim() !== "") {
      const searchStr = params.search.trim();
      where.OR = [
        { transactionCode: { contains: searchStr, mode: "insensitive" } },
        { orderCode: { contains: searchStr, mode: "insensitive" } },
        { description: { contains: searchStr, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.topupTransaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          paymentMethod: true,
          wireImages: true,
        },
      }),
      this.prisma.topupTransaction.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Khởi tạo giao dịch nạp tiền mới (topupType = ADDED_FUNDS, status = 1 WAITING)
   * - Sử dụng Database Transaction ($transaction) đảm bảo tính toàn vẹn dữ liệu
   * - Tạo bản ghi nạp tiền trong topup_transactions
   * - Lưu danh sách các ảnh chứng từ chuyển khoản vào topup_transaction_wire_images
   * - Khởi tạo log lịch sử tại topup_transaction_histories với actionName = "Khách hàng tạo mới giao dịch"
   */
  async createTopupRequest(data: {
    customerId: string;
    transactionCode: string;
    paymentMethodId: number;
    wireAmount: number;
    rate?: number;
    description?: string;
    wireDate?: Date;
    wireImages?: string[];
  }) {
    const currentBalance = (await this.getWalletSummary(data.customerId)).accountBalance;

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.topupTransaction.create({
        data: {
          customerId: data.customerId,
          transactionCode: data.transactionCode,
          topupType: TopupType.ADDED_FUNDS,
          currency: "USD",
          submissionDate: new Date(),
          wireDate: data.wireDate ?? new Date(),
          paymentMethodId: data.paymentMethodId,
          wireAmount: new Prisma.Decimal(data.wireAmount),
          wireAmountApprove: new Prisma.Decimal(0),
          rate: data.rate ? new Prisma.Decimal(data.rate) : null,
          description: data.description ?? null,
          accountBalanceBefore: new Prisma.Decimal(currentBalance),
          amountChange: new Prisma.Decimal(data.wireAmount),
          accountBalanceAfter: new Prisma.Decimal(currentBalance),
          status: 1,
          createdBy: data.customerId,
          wireImages: data.wireImages && data.wireImages.length > 0
            ? {
                create: data.wireImages.map((url) => ({ imageUrl: url })),
              }
            : undefined,
        },
        include: {
          wireImages: true,
          paymentMethod: true,
        },
      });

      // Ghi log history "Khách hàng tạo mới giao dịch" (status = 1)
      await tx.topupTransactionHistory.create({
        data: {
          actionName: "Khách hàng tạo mới giao dịch",
          topupTransactionId: transaction.id,
          status: 1,
          createdBy: data.customerId,
        },
      });

      return transaction;
    });
  }

  /**
   * Update topup request (only allowed when status = 1 and belongs to logged in customer)
   */
  async updateTopupRequest(
    id: number,
    customerId: string,
    data: {
      paymentMethodId?: number;
      wireAmount?: number;
      description?: string;
      wireDate?: Date;
      wireImages?: string[];
    },
  ) {
    const existing = await this.prisma.topupTransaction.findFirst({
      where: {
        id,
        customerId,
        status: 1,
      },
    });

    if (!existing) {
      throw new Error("Giao dịch không tồn tại hoặc không thể chỉnh sửa.");
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.wireImages) {
        await tx.topupTransactionWireImage.deleteMany({
          where: { transactionId: id },
        });
      }

      const updated = await tx.topupTransaction.update({
        where: { id },
        data: {
          paymentMethodId: data.paymentMethodId ?? existing.paymentMethodId,
          wireAmount: data.wireAmount ? new Prisma.Decimal(data.wireAmount) : existing.wireAmount,
          amountChange: data.wireAmount ? new Prisma.Decimal(data.wireAmount) : existing.amountChange,
          description: data.description !== undefined ? data.description : existing.description,
          wireDate: data.wireDate ?? existing.wireDate,
          updatedBy: customerId,
          wireImages: data.wireImages && data.wireImages.length > 0
            ? {
                create: data.wireImages.map((url) => ({ imageUrl: url })),
              }
            : undefined,
        },
        include: {
          wireImages: true,
          paymentMethod: true,
        },
      });

      await tx.topupTransactionHistory.create({
        data: {
          actionName: "UPDATED",
          topupTransactionId: updated.id,
          status: 1,
          createdBy: customerId,
        },
      });

      return updated;
    });
  }

  /**
   * Cancel topup request (only allowed when status = 1 and belongs to logged in customer)
   */
  async cancelTopupRequest(id: number, customerId: string) {
    const existing = await this.prisma.topupTransaction.findFirst({
      where: {
        id,
        customerId,
        status: 1,
      },
    });

    if (!existing) {
      throw new Error("Giao dịch không tồn tại hoặc không thể hủy.");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.topupTransaction.update({
        where: { id },
        data: {
          status: 3,
          updatedBy: customerId,
        },
      });

      await tx.topupTransactionHistory.create({
        data: {
          actionName: "CANCELLED",
          topupTransactionId: updated.id,
          status: 3,
          createdBy: customerId,
        },
      });

      return updated;
    });
  }
}
