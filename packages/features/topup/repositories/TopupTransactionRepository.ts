import { Prisma, type PrismaClient, TopupType } from "@ecom/prisma";
import { generateEntityCode } from "@flash-ship/ecom-lib";
import { TopupStatus } from "@flash-ship/ecom-types";
import { ExternalWalletClient } from "../clients";
import {
  EXTERNAL_WALLET_FROM_SYSTEM,
  EXTERNAL_WALLET_PAYMENT_TYPE,
  ExternalWalletActionType,
} from "../dtos/externalWalletDTOs";

/**
 * Các tham số bộ lọc tìm kiếm và phân trang cho danh sách lịch sử giao dịch nạp tiền
 */
export interface FilterTopupHistoryParams {
  /** Mã định danh khách hàng (Dùng để cách ly dữ liệu giữa các khách hàng) */
  customerId?: string;
  /** Trang hiện tại (Mặc định: 1) */
  page?: number;
  /** Số bản ghi trên 1 trang (Mặc định: 10) */
  pageSize?: number;
  /** Từ khóa tìm kiếm (Tìm theo Mã giao dịch, Mã đơn hàng, Nội dung ghi chú) */
  search?: string;
  /** ID phương thức thanh toán (Wire Transfer, WorldFirst, Paypal, v.v.) */
  paymentMethodId?: number;
  /** Trạng thái giao dịch: 1 = Waiting (Chờ xác nhận), 2 = Confirmed (Đã xác nhận), 3 = Reject (Từ chối) */
  status?: string;
  /** Ngày bắt đầu lọc giao dịch */
  dateFrom?: Date;
  /** Ngày kết thúc lọc giao dịch */
  dateTo?: Date;
  /** Tên trường sắp xếp (transactionCode, submissionDate, wireDate, wireAmount, wireAmountApprove, customerCode, customerName, status) */
  sortBy?: string;
  /** Thứ tự sắp xếp ("asc" | "desc") */
  sortOrder?: "asc" | "desc";
}

/**
 * Các tham số bộ lọc truy vấn lịch sử biến động số dư ví (`getTransactionHistoryList`)
 */
export interface FilterTransactionHistoryParams {
  /** Mã định danh khách hàng bắt buộc (Dùng để bảo mật cách ly dữ liệu) */
  customerId: string;
  /** Trang hiện tại (Mặc định: 1) */
  page?: number;
  pageSize?: number;
  /** Từ khóa tìm kiếm theo mã đơn hàng, order_id, mã giao dịch */
  search?: string;
  /** Loại giao dịch (PAID, ADDED_FUNDS, CANCELED, REFUNDED, ADJUST_BALANCE_INCREASE, ADJUST_BALANCE_DECREASE) */
  topupType?: string;
  /** Trạng thái giao dịch (Mặc định: 2 = TopupStatus.CONFIRMED - Chỉ lấy các giao dịch đã phê duyệt) */
  status?: number;
  /** Ngày bắt đầu lọc giao dịch */
  dateFrom?: Date;
  /** Ngày kết thúc lọc giao dịch */
  dateTo?: Date;
  /** Tên trường sắp xếp (mặc định: updatedAt) */
  sortBy?: string;
  /** Thứ tự sắp xếp ("asc" | "desc") */
  sortOrder?: "asc" | "desc";
}

/**
 * Repository xử lý các thao tác dữ liệu liên quan đến Giao dịch nạp tiền (Topup Transactions)
 */
export class TopupTransactionRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Lấy mã khách hàng (customerCode) hiển thị dựa trên customerId
   * - Lấy ưu tiên `customerCode` -> `username` -> fallback `customerId`
   *
   * @param customerId ID của khách hàng
   * @returns Mã khách hàng dạng chuỗi
   */
  /**
   * Truy vấn mã khách hàng (customerCode / partnerCode) từ DB Postgres Local.
   * Nếu dữ liệu cũ (legacy) chưa có customerCode, tự động sinh mã mới KHxxxxx và lưu lại vào DB.
   *
   * @param customerId ID của khách hàng (UUID)
   * @returns Mã khách hàng dạng chuỗi (partnerCode)
   */
  async getCustomerCode(customerId: string): Promise<string> {
    // 1. Truy vấn mã customerCode từ bảng Customer theo customerId
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, customerCode: true, username: true },
    });

    // 2. Trả về customerCode có sẵn nếu đã có trong DB
    if (customer?.customerCode) {
      return customer.customerCode;
    }

    // 3. Nếu chưa có customerCode (tài khoản cũ legacy), tự động sinh mã KHxxxxx mới
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const newCode = customer?.username || `KH${randomSuffix}`;

    // 4. Cập nhật mã customerCode mới sinh vào DB Postgres Local
    if (customer) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { customerCode: newCode },
      });
    }

    return newCode;
  }

  async getWalletSummary(customerId: string) {
    // 1. Lấy số dư ví từ hệ thống ví độc lập qua endpoint /payment-api/account/info (Tự động bù ví nếu chưa tồn tại)
    let accountBalance = 0.0;

    try {
      const walletClient = new ExternalWalletClient();
      const accountInfoRes = await walletClient.getAccountInfo(
        { partnerId: customerId },
        () => this.getCustomerCode(customerId),
      );
      const resData = (accountInfoRes as any)?.data;
      const rawBal =
        resData?.balance ??
        resData?.accountBalance ??
        resData?.account_balance ??
        resData?.accountInfo?.balance;
      if (rawBal !== undefined && rawBal !== null && !isNaN(Number(rawBal))) {
        accountBalance = Number(rawBal);
      } else {
        // Fallback: Lấy giao dịch đã xác nhận (status = TopupStatus.CONFIRMED) gần nhất từ DB Local
        const latestTx = await this.prisma.topupTransaction.findFirst({
          where: {
            customerId,
            status: TopupStatus.CONFIRMED,
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          select: { accountBalanceAfter: true },
        });

        accountBalance = latestTx?.accountBalanceAfter
          ? Number(latestTx.accountBalanceAfter)
          : 0.0;
      }
    } catch {
      // Fallback dự phòng an toàn khi API Hệ Thống Ví Độc Lập chưa khởi tạo tài khoản hoặc lỗi mạng:
      // Lấy từ bản ghi CONFIRMED mới nhất trong DB Local
      const latestTx = await this.prisma.topupTransaction.findFirst({
        where: {
          customerId,
          status: TopupStatus.CONFIRMED,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: { accountBalanceAfter: true },
      });

      accountBalance = latestTx?.accountBalanceAfter
        ? Number(latestTx.accountBalanceAfter)
        : 0.0;
    }

    // 2. Tính tổng tiền các giao dịch đang ở trạng thái Chờ xác nhận (status = TopupStatus.WAITING)
    const waitingAggregate = await this.prisma.topupTransaction.aggregate({
      where: {
        customerId,
        status: TopupStatus.WAITING, // 1 = Created / Waiting
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

  private resolveDefaultDateRange(dateFrom?: Date, dateTo?: Date) {
    if (dateFrom || dateTo) return { fromDate: dateFrom, toDate: dateTo };
    const now = new Date();
    const toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return { fromDate: sevenDaysAgo, toDate };
  }

  private buildTopupHistoryWhere(params: FilterTopupHistoryParams): Prisma.TopupTransactionWhereInput {
    const { fromDate, toDate } = this.resolveDefaultDateRange(params.dateFrom, params.dateTo);
    const where: Prisma.TopupTransactionWhereInput = {};

    if (params.customerId) {
      where.customerId = params.customerId;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) {
        const endOfToDate = new Date(toDate);
        endOfToDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfToDate;
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

    return where;
  }

  private buildTopupHistoryOrderBy(params: FilterTopupHistoryParams): Prisma.TopupTransactionOrderByWithRelationInput {
    if (!params.sortBy) return { createdAt: "desc" };
    const order = params.sortOrder === "asc" ? "asc" : "desc";
    const sortMap: Record<string, Prisma.TopupTransactionOrderByWithRelationInput> = {
      transactionCode: { transactionCode: order },
      submissionDate: { createdAt: order },
      createdAt: { createdAt: order },
      wireDate: { wireDate: order },
      wireAmount: { wireAmount: order },
      wireAmountApprove: { wireAmountApprove: order },
      customerCode: { customer: { customerCode: order } },
      customerName: { customer: { name: order } },
      status: { status: order },
    };
    return sortMap[params.sortBy] || { createdAt: "desc" };
  }

  /**
   * Lấy danh sách lịch sử nạp tiền có phân trang và bộ lọc
   */
  async getTopupHistory(params: FilterTopupHistoryParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 10;
    const skip = (page - 1) * pageSize;

    const where = this.buildTopupHistoryWhere(params);
    const orderBy = this.buildTopupHistoryOrderBy(params);

    const [data, total] = await Promise.all([
      this.prisma.topupTransaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          customer: true,
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

  private buildTransactionHistoryWhere(params: FilterTransactionHistoryParams): Prisma.TopupTransactionWhereInput {
    const now = new Date();
    let { fromDate, toDate } = this.resolveDefaultDateRange(params.dateFrom, params.dateTo);

    if (toDate && toDate.getTime() > now.getTime()) {
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    const where: Prisma.TopupTransactionWhereInput = {
      customerId: params.customerId,
      status: TopupStatus.CONFIRMED,
    };

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) {
        const endOfToDate = new Date(toDate);
        endOfToDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfToDate;
      }
    }

    if (params.topupType && params.topupType !== "ALL" && params.topupType.trim() !== "") {
      where.topupType = params.topupType.trim();
    }

    if (params.search && params.search.trim() !== "") {
      const searchStr = params.search.trim();
      where.OR = [
        { orderCode: { contains: searchStr, mode: "insensitive" } },
        { orderId: { equals: searchStr } },
        { transactionCode: { contains: searchStr, mode: "insensitive" } },
        { description: { contains: searchStr, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private buildTransactionHistoryOrderBy(params: FilterTransactionHistoryParams): Prisma.TopupTransactionOrderByWithRelationInput {
    if (!params.sortBy) return { updatedAt: "desc" };
    const order = params.sortOrder === "asc" ? "asc" : "desc";
    const sortMap: Record<string, Prisma.TopupTransactionOrderByWithRelationInput> = {
      submissionDate: { submissionDate: order },
      submission_date: { submissionDate: order },
      createdAt: { createdAt: order },
      created_at: { createdAt: order },
      updatedAt: { updatedAt: order },
      updated_at: { updatedAt: order },
    };
    return sortMap[params.sortBy] || { updatedAt: "desc" };
  }

  /**
   * Lấy danh sách lịch sử biến động số dư ví (Transaction History List)
   */
  async getTransactionHistoryList(params: FilterTransactionHistoryParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 10;
    const skip = (page - 1) * pageSize;

    const where = this.buildTransactionHistoryWhere(params);
    const orderBy = this.buildTransactionHistoryOrderBy(params);

    const [data, total] = await Promise.all([
      this.prisma.topupTransaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          submissionDate: true,
          orderCode: true,
          orderId: true,
          topupType: true,
          accountBalanceBefore: true,
          amountChange: true,
          accountBalanceAfter: true,
          description: true,
          createdAt: true,
          updatedAt: true,
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
   * Khởi tạo giao dịch nạp tiền mới từ phía khách hàng (topupType = ADDED_FUNDS, status = TopupStatus.WAITING)
   * - Sử dụng Database Transaction ($transaction) đảm bảo tính toàn vẹn dữ liệu
   * - Tạo bản ghi nạp tiền trong bảng `topup_transactions`
   * - Lưu danh sách ảnh chụp chứng từ chuyển khoản vào bảng `topup_transaction_wire_images`
   * - Khởi tạo nhật ký trong `topup_transaction_histories` với actionName = "Khách hàng tạo mới giao dịch"
   *
   * @param data Dữ liệu giao dịch khởi tạo
   * @returns Bản ghi giao dịch nạp tiền vừa tạo
   */
  async createTopupRequest(data: {
    customerId: string;
    transactionCode: string;
    paymentMethodId: number;
    wireAmount: number;
    currency?: string;
    rate?: number;
    description?: string;
    wireDate?: Date;
    wireImages?: string[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.topupTransaction.create({
        data: {
          customer: { connect: { id: data.customerId } },
          transactionCode: data.transactionCode,
          topupType: TopupType.ADDED_FUNDS,
          currency: data.currency || "USD",
          submissionDate: new Date(),
          wireDate: data.wireDate ?? new Date(),
          paymentMethod: data.paymentMethodId ? { connect: { id: data.paymentMethodId } } : undefined,
          wireAmount: new Prisma.Decimal(data.wireAmount),
          rate: data.rate !== undefined && data.rate !== null ? new Prisma.Decimal(data.rate) : new Prisma.Decimal(0),
          description: data.description ?? null,
          status: TopupStatus.WAITING, // 1 = WAITING (Chờ xác nhận)
          createdBy: data.customerId,
          wireImages:
            data.wireImages && data.wireImages.length > 0
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

      // Ghi nhật ký lịch sử thao tác: Khách hàng tạo mới giao dịch
      await tx.topupTransactionHistory.create({
        data: {
          actionName: "Khách hàng tạo mới giao dịch",
          topupTransactionId: transaction.id,
          status: TopupStatus.WAITING,
          createdBy: data.customerId,
        },
      });

      return transaction;
    });
  }

  /**
   * Cập nhật thông tin giao dịch nạp tiền (Chỉ áp dụng khi giao dịch ở trạng thái status = TopupStatus.WAITING Chờ xác nhận)
   * - Kiểm tra giao dịch tồn tại và đúng khách hàng khởi tạo
   * - Xóa và cập nhật lại danh sách ảnh chứng từ nếu có
   * - Lưu lịch sử thao tác cập nhật vào bảng `topup_transaction_histories`
   *
   * @param id ID bản ghi nạp tiền
   * @param customerId ID khách hàng thực hiện cập nhật
   * @param data Các trường dữ liệu cho phép chỉnh sửa
   * @returns Bản ghi giao dịch sau khi cập nhật
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
        status: TopupStatus.WAITING, // Chỉ cho phép sửa khi còn ở trạng thái Chờ xác nhận
      },
    });

    if (!existing) {
      throw new Error("Giao dịch không tồn tại hoặc không thể chỉnh sửa.");
    }

    return this.prisma.$transaction(async (tx) => {
      // Nếu có cập nhật danh sách ảnh mới (và có ít nhất 1 ảnh), xóa danh sách ảnh cũ trước
      if (data.wireImages && data.wireImages.length > 0) {
        await tx.topupTransactionWireImage.deleteMany({
          where: { transactionId: id },
        });
      }

      const updated = await tx.topupTransaction.update({
        where: { id },
        data: {
          paymentMethodId: data.paymentMethodId ?? existing.paymentMethodId,
          wireAmount: data.wireAmount ? new Prisma.Decimal(data.wireAmount) : existing.wireAmount,
          description: data.description !== undefined ? data.description : existing.description,
          wireDate: data.wireDate ?? existing.wireDate,
          updatedBy: customerId,
          wireImages:
            data.wireImages && data.wireImages.length > 0
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

      // Ghi nhật ký lịch sử cập nhật giao dịch
      await tx.topupTransactionHistory.create({
        data: {
          actionName: "Khách hàng cập nhật giao dịch",
          topupTransactionId: updated.id,
          status: TopupStatus.WAITING,
          createdBy: customerId,
        },
      });

      return updated;
    });
  }

  /**
   * Hủy hoặc từ chối giao dịch nạp tiền (Chuyển trạng thái status = TopupStatus.REJECT)
   * - Khách hàng tự hủy: Truyền `customerId` để kiểm tra đúng giao dịch của chính mình.
   * - Admin từ chối: Bỏ qua `customerId` (hoặc truyền undefined), lọc theo ID giao dịch và `status = TopupStatus.WAITING`.
   * - Lưu vết ID người thực hiện thao tác (Admin hoặc Customer) vào `updatedBy` và lịch sử `topup_transaction_histories`.
   *
   * @param id ID bản ghi giao dịch nạp tiền
   * @param customerId ID khách hàng (Bắt buộc nếu khách hàng tự hủy, để trống nếu Admin từ chối)
   * @param actorId ID tài khoản người thực hiện thao tác (Customer ID hoặc Admin User ID)
   * @param reason Lý do từ chối giao dịch (Lưu vào trường description)
   * @returns Bản ghi giao dịch sau khi hủy / từ chối
   */
  async cancelTopupRequest(id: number, customerId?: string, actorId?: string, reason?: string) {
    const where: Prisma.TopupTransactionWhereInput = {
      id,
      status: TopupStatus.WAITING, // Chỉ cho phép hủy/từ chối khi giao dịch ở trạng thái Chờ xác nhận
    };
    if (customerId) {
      where.customerId = customerId;
    }

    const existing = await this.prisma.topupTransaction.findFirst({
      where,
    });

    if (!existing) {
      throw new Error("Giao dịch không tồn tại hoặc không thể hủy.");
    }

    const operatorId = actorId || customerId || "SYSTEM";
    const rejectReason = reason && reason.trim() !== "" ? reason.trim() : null;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.topupTransaction.update({
        where: { id },
        data: {
          status: TopupStatus.REJECT, // 3 = Reject / Cancelled
          description: rejectReason, // Trường description chỉ dùng để lưu lý do từ chối (Reject) giao dịch
          updatedBy: operatorId,
        },
      });

      // Ghi nhật ký lịch sử thao tác hủy / từ chối giao dịch
      await tx.topupTransactionHistory.create({
        data: {
          actionName: "Hủy giao dịch",
          topupTransactionId: updated.id,
          status: TopupStatus.REJECT,
          createdBy: operatorId,
        },
      });

      return updated;
    });
  }

  /**
   * Điều chỉnh số tiền / thông tin giao dịch nạp tiền (Dành cho Admin)
   * - Cập nhật `wireAmountApproved` = số tiền duyệt mới
   * - Cập nhật `wireDate` nếu chọn ngày mới
   * - Nếu có danh sách ảnh mới: Xóa toàn bộ ảnh cũ trong `topup_transaction_wire_images` và tạo mới
   * - Giữ nguyên `description` và `status` hiện tại
   * - Lưu vết `updatedBy = actorId`, `updatedAt = new Date()`
   * - Ghi nhật ký lịch sử thao tác vào `topup_transaction_histories` với actionName = "Điều chỉnh balance"
   *
   * @param id ID bản ghi nạp tiền
   * @param actorId ID tài khoản Admin thực hiện điều chỉnh
   * @param data Dữ liệu điều chỉnh (wireAmountApproved, wireDate, wireImages)
   * @returns Bản ghi giao dịch sau khi điều chỉnh
   */
  async adjustTopupRequest(
    id: number,
    actorId: string,
    data: {
      wireAmountApproved: number;
      wireDate?: Date;
      wireImages?: string[];
    },
  ) {
    const existing = await this.prisma.topupTransaction.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Giao dịch không tồn tại.");
    }

    return this.prisma.$transaction(async (tx) => {
      // Nếu có tải lên danh sách ảnh mới, xóa toàn bộ ảnh cũ trước khi tạo lại
      if (data.wireImages && data.wireImages.length > 0) {
        await tx.topupTransactionWireImage.deleteMany({
          where: { transactionId: id },
        });
      }

      const updated = await tx.topupTransaction.update({
        where: { id },
        data: {
          wireAmountApprove: new Prisma.Decimal(data.wireAmountApproved),
          wireDate: data.wireDate ?? existing.wireDate,
          updatedBy: actorId,
          updatedAt: new Date(),
          wireImages:
            data.wireImages && data.wireImages.length > 0
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

      // Ghi nhật ký lịch sử thao tác Điều chỉnh balance
      await tx.topupTransactionHistory.create({
        data: {
          actionName: "Điều chỉnh balance",
          topupTransactionId: updated.id,
          wireAmountApproved: new Prisma.Decimal(data.wireAmountApproved),
          status: updated.status,
          createdBy: actorId,
        },
      });

      return updated;
    });
  }

  /** Map khóa giao dịch đang trong quá trình phê duyệt (Chống race condition 2 Admin phê duyệt cùng lúc) */
  private static approvingTransactionIds = new Set<number>();

  private async resolveBalanceAfterAndBefore(
    chargingRes: unknown,
    walletClient: ExternalWalletClient,
    customerId: string,
    previousConfirmedBalance: number,
    approvedAmount: number,
  ): Promise<{ balanceBefore: number; balanceAfter: number }> {
    let balanceAfter: number | null = null;
    const chargingData = (chargingRes as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    const rawBalFromCharging = chargingData?.balance ?? chargingData?.accountBalance ?? chargingData?.account_balance;

    if (rawBalFromCharging !== undefined && rawBalFromCharging !== null && !Number.isNaN(Number(rawBalFromCharging))) {
      balanceAfter = Number(rawBalFromCharging);
    }

    if (balanceAfter === null) {
      try {
        const accountInfo = await walletClient.getAccountInfo({ partnerId: customerId });
        const resData = (accountInfo as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        const rawBal =
          resData?.balance ??
          resData?.accountBalance ??
          resData?.account_balance ??
          (resData?.accountInfo as Record<string, unknown> | undefined)?.balance;
        if (rawBal !== undefined && rawBal !== null && !Number.isNaN(Number(rawBal))) {
          balanceAfter = Number(rawBal);
        }
      } catch {
        // Dự phòng an toàn
      }
    }

    const roundCurrency = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
    if (balanceAfter !== null && balanceAfter > previousConfirmedBalance) {
      return {
        balanceBefore: roundCurrency(previousConfirmedBalance),
        balanceAfter: roundCurrency(balanceAfter),
      };
    }
    return {
      balanceBefore: roundCurrency(previousConfirmedBalance),
      balanceAfter: roundCurrency(previousConfirmedBalance + approvedAmount),
    };
  }

  /**
   * Phê duyệt giao dịch nạp tiền (Dành cho Admin)
   * Quy trình Single Source of Truth Flow:
   * 1. Kiểm tra bản ghi giao dịch tồn tại và status === TopupStatus.WAITING (1)
   * 2. Tính toán wireAmountApproved: Nếu status = 1, wireAmount > 0 và wireAmountApproved > 0 thì giữ nguyên, ngược lại = wireAmount.
   * 3. Gọi chargingRequest (INCREASE) sang Ví Độc Lập TRƯỚC. Nếu thất bại, DB Local giữ nguyên status = 1 (WAITING), ném lỗi và bắn Toast đỏ cho Admin.
   * 4. Gọi getAccountInfo lấy balance THỰC TẾ mới nhất từ Ví Độc Lập làm accountBalanceAfter (Single Source of Truth).
   * 5. Cập nhật DB Local trong $transaction (< 5ms): status = 2 (CONFIRMED), wireAmountApprove, accountBalanceBefore, amountChange, accountBalanceAfter, updatedBy, updatedAt, và ghi log History ("Xác nhận giao dịch thanh toán").
   */
  async approveTopupRequest(id: number, actorId: string) {
    if (TopupTransactionRepository.approvingTransactionIds.has(id)) {
      throw new Error("Giao dịch đang được hệ thống xử lý, vui lòng chờ trong giây lát.");
    }

    TopupTransactionRepository.approvingTransactionIds.add(id);

    try {
      const existing = await this.prisma.topupTransaction.findFirst({
        where: { id, status: TopupStatus.WAITING },
        include: { customer: true },
      });

      if (!existing) {
        throw new Error("Giao dịch không tồn tại hoặc đã được xử lý bởi người dùng khác.");
      }

    // LƯU Ý NGHIỆP VỤ: Nếu wireAmountApprove > 0 (đã qua bước Admin điều chỉnh trước đó) thì giữ nguyên, ngược lại mặc định lấy theo wireAmount yêu cầu ban đầu.
    let approvedAmount = Number(existing.wireAmountApprove);
    if (approvedAmount <= 0) {
      approvedAmount = Number(existing.wireAmount);
    }

    // BƯỚC 1: Lấy số dư ĐÃ XÁC NHẬN gần nhất của khách hàng từ DB Local trước giao dịch này
    const latestConfirmedTx = await this.prisma.topupTransaction.findFirst({
      where: {
        customerId: existing.customerId,
        status: TopupStatus.CONFIRMED,
        id: { not: existing.id },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { accountBalanceAfter: true },
    });

    const previousConfirmedBalance = latestConfirmedTx?.accountBalanceAfter
      ? Number(latestConfirmedTx.accountBalanceAfter)
      : 0;

    // BƯỚC 1.5: Đảm bảo tài khoản ví đã được tạo trên Hệ Thống Ví Độc Lập qua getWalletSummary master
    await this.getWalletSummary(existing.customerId);

    // BƯỚC 2: BẮT BUỘC gọi API cộng tiền (chargingRequest actionType = 1: INCREASE) sang Hệ Thống Ví Độc Lập TRƯỚC.
    // LƯU Ý KỸ THUẬT: Đính kèm callback supplier () => this.getCustomerCode(...) để tự động tạo ví bù nếu gặp lỗi Seller Not Found.
    const walletClient = new ExternalWalletClient();
    const chargingRes = await walletClient.chargingRequest(
      {
        fromSystem: EXTERNAL_WALLET_FROM_SYSTEM,
        buyerInfo: {
          partnerId: existing.customerId,
          partnerCode: existing.customer?.customerCode || "",
        },
        orderItem: {
          actionType: ExternalWalletActionType.INCREASE, // 1 = Cộng tiền vào ví
          paymentType: EXTERNAL_WALLET_PAYMENT_TYPE,
          price: approvedAmount,
          note: `Approved topup transaction #${existing.transactionCode}`,
          orderCode: null,
        },
      },
      () => this.getCustomerCode(existing.customerId),
    );

    // BƯỚC 3: Xác định số dư THỰC TẾ sau giao dịch (balanceAfter = X) từ API Ví Độc Lập hoặc tự động cộng dồn
    let balanceAfter: number | null = null;

    // 3.1 Thử lấy balance từ kết quả trả về của chargingRequest (nếu có)
    const chargingData = (chargingRes as any)?.data;
    const rawBalFromCharging =
      chargingData?.balance ?? chargingData?.accountBalance ?? chargingData?.account_balance;
    if (rawBalFromCharging !== undefined && rawBalFromCharging !== null && !isNaN(Number(rawBalFromCharging))) {
      balanceAfter = Number(rawBalFromCharging);
    }

    // 3.2 Thử gọi getAccountInfo lấy balance mới nhất từ Ví Độc Lập
    if (balanceAfter === null) {
      try {
        const accountInfo = await walletClient.getAccountInfo(
          { partnerId: existing.customerId },
          () => this.getCustomerCode(existing.customerId),
        );
        const resData = (accountInfo as any)?.data;
        const rawBal =
          resData?.balance ??
          resData?.accountBalance ??
          resData?.account_balance ??
          resData?.accountInfo?.balance;
        if (rawBal !== undefined && rawBal !== null && !isNaN(Number(rawBal))) {
          balanceAfter = Number(rawBal);
        }
      } catch {
        // Dự phòng an toàn: Nếu API getAccountInfo gặp sự cố tạm thời
      }
    }

    // 3.3 Tính toán chuẩn xác nghiệp vụ & làm tròn 2 chữ số thập phân (tránh lỗi floating point JavaScript):
    // - account_balance_before: Bằng số dư sau (account_balance_after) của giao dịch xác nhận trước đó (previousConfirmedBalance)
    // - account_balance_after: Bằng X (số dư mới sau khi cộng) hoặc previousConfirmedBalance + approvedAmount
    const roundCurrency = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

    let balanceBefore: number;

    if (balanceAfter !== null && balanceAfter > previousConfirmedBalance) {
      // API ví độc lập thực sự trả về số dư mới X tăng lên sau khi cộng tiền
      balanceBefore = roundCurrency(previousConfirmedBalance);
      balanceAfter = roundCurrency(balanceAfter);
    } else {
      // Fallback chuẩn xác khi dev API trả về balance tĩnh hoặc không trả về balance:
      balanceBefore = roundCurrency(previousConfirmedBalance);
      balanceAfter = roundCurrency(previousConfirmedBalance + approvedAmount);
    }

    // BƯỚC 4: Cập nhật DB Local trong $transaction nhanh gọn (< 5ms)
    // Cập nhật trọn vẹn 3 trường: account_balance_before = previousConfirmedBalance, amount_change = approvedAmount, và account_balance_after = balanceAfter
    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.topupTransaction.update({
        where: { id },
        data: {
          status: TopupStatus.CONFIRMED,
          wireAmountApprove: new Prisma.Decimal(approvedAmount),
          accountBalanceBefore: new Prisma.Decimal(balanceBefore),
          amountChange: new Prisma.Decimal(approvedAmount),
          accountBalanceAfter: new Prisma.Decimal(balanceAfter),
          updatedBy: actorId,
          updatedAt: new Date(),
        },
        include: {
          wireImages: true,
          paymentMethod: true,
          customer: true,
        },
      });

      // Ghi nhật ký lịch sử thao tác Phê duyệt
      await tx.topupTransactionHistory.create({
        data: {
          actionName: "Xác nhận giao dịch thanh toán",
          topupTransactionId: id,
          wireAmountApproved: new Prisma.Decimal(approvedAmount),
          status: TopupStatus.CONFIRMED,
          createdBy: actorId,
        },
      });

      return updated;
    });
    } finally {
      TopupTransactionRepository.approvingTransactionIds.delete(id);
    }
  }

  /** Bộ nhớ tạm In-Memory Mutex Lock chống Race Condition / Double-Click khi thanh toán đơn hàng */
  private static payingOrderIds = new Set<string>();

  /**
   * Trừ số dư ví khách hàng khi thanh toán đơn hàng thành công (`payOrderWithWallet`)
   *
   * QUY TRÌNH BẢO VỆ 3 LỚP & TỐI ƯU SIÊU ĐỘ TRỄ:
   * 1. Lớp 1 (RAM Lock): Khóa In-Memory Mutex Lock theo `orderId` chống spam bấm Postman / double-click.
   * 2. Lớp 2 (DB State Check): Kiểm tra DB Local nếu đơn hàng đã được thanh toán trước đó thì từ chối ngay.
   * 3. Lớp 3 (External Wallet Idempotency): Gọi API `/payment-api/charging-request` với `actionType: 2 (DECREASE)` sang Hệ Thống Ví Độc Lập TRƯỚC.
   * 4. Single SQL Nested Write (< 2ms): Tận dụng Prisma Nested Write tạo `topup_transactions` và `topup_transaction_histories` trong duy nhất 1 câu lệnh SQL.
   *
   * @param data Dữ liệu đơn hàng và khách hàng cần trừ tiền
   * @returns Bản ghi giao dịch nạp/trừ tiền vừa tạo
   */
  async payOrderWithWallet(data: {
    orderId: string;
    orderCode: string;
    amount: number;
    customerId: string;
    actorId?: string;
    description?: string;
  }) {
    // BƯỚC 1: Lớp 1 - Khóa In-Memory Mutex Lock chống Race Condition / Spam Postman cùng lúc
    if (TopupTransactionRepository.payingOrderIds.has(data.orderId)) {
      throw new Error(`Đơn hàng #${data.orderCode} đang trong quá trình xử lý thanh toán, vui lòng chờ trong giây lát.`);
    }

    TopupTransactionRepository.payingOrderIds.add(data.orderId);

    try {
      // BƯỚC 2: Lớp 2 - Kiểm tra DB Local chống thanh toán trùng lặp đơn hàng đã hoàn tất
      const existingPayment = await this.prisma.topupTransaction.findFirst({
        where: {
          orderId: data.orderId,
          topupType: TopupType.PAID,
          status: TopupStatus.CONFIRMED,
        },
        select: { id: true, transactionCode: true },
      });

      if (existingPayment) {
        throw new Error(`Đơn hàng #${data.orderCode} đã được thanh toán trước đó (Mã GD: ${existingPayment.transactionCode}).`);
      }

      // BƯỚC 3: Lấy số dư ví khả dụng hiện tại từ API Ví Độc Lập (/payment-api/account/info)
      let balanceBefore = 0.0;
      const walletClient = new ExternalWalletClient();

      try {
        const accountInfoRes = await walletClient.getAccountInfo(
          { partnerId: data.customerId },
          () => this.getCustomerCode(data.customerId),
        );
        const resData = (accountInfoRes as any)?.data;
        const rawBal =
          resData?.balance ??
          resData?.accountBalance ??
          resData?.account_balance ??
          resData?.accountInfo?.balance;

        if (rawBal !== undefined && rawBal !== null && !isNaN(Number(rawBal))) {
          balanceBefore = Number(rawBal);
        } else {
          // Fallback DB Local
          const latestTx = await this.prisma.topupTransaction.findFirst({
            where: { customerId: data.customerId, status: TopupStatus.CONFIRMED },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            select: { accountBalanceAfter: true },
          });
          balanceBefore = latestTx?.accountBalanceAfter ? Number(latestTx.accountBalanceAfter) : 0.0;
        }
      } catch {
        const latestTx = await this.prisma.topupTransaction.findFirst({
          where: { customerId: data.customerId, status: TopupStatus.CONFIRMED },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          select: { accountBalanceAfter: true },
        });
        balanceBefore = latestTx?.accountBalanceAfter ? Number(latestTx.accountBalanceAfter) : 0.0;
      }

      // BƯỚC 4: Kiểm tra điều kiện số dư ví khả dụng
      if (balanceBefore < data.amount) {
        throw new Error("Số dư ví khả dụng không đủ để thanh toán đơn hàng này. Vui lòng nạp thêm tiền vào ví.");
      }

      const customerCode = await this.getCustomerCode(data.customerId);

      // BƯỚC 4.5: Đảm bảo tài khoản ví đã được tạo trên Hệ Thống Ví Độc Lập qua getWalletSummary master
      await this.getWalletSummary(data.customerId);

      // BƯỚC 5: Lớp 3 - Gọi API trừ tiền Ví Độc Lập (actionType = 2: DECREASE) TRƯỚC
      const chargingRes = await walletClient.chargingRequest(
        {
          fromSystem: EXTERNAL_WALLET_FROM_SYSTEM,
          buyerInfo: {
            partnerId: data.customerId,
            partnerCode: customerCode,
          },
          orderItem: {
            actionType: ExternalWalletActionType.DECREASE, // 2 = Trừ tiền ví
            paymentType: EXTERNAL_WALLET_PAYMENT_TYPE,
            price: data.amount,
            note: `Charge for order #${data.orderCode}`,
            orderCode: data.orderCode,
          },
        },
        () => this.getCustomerCode(data.customerId),
      );

      // Tối ưu hóa 1 HTTP Network Call: Bóc tách trực tiếp balance sau khi trừ từ response
      const roundCurrency = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
      const chargingData = (chargingRes as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const resBalAfter = chargingData?.balance ?? chargingData?.accountBalance;

      let balanceAfter: number;
      if (resBalAfter !== undefined && resBalAfter !== null && !Number.isNaN(Number(resBalAfter))) {
        balanceAfter = roundCurrency(Number(resBalAfter));
      } else {
        balanceAfter = roundCurrency(balanceBefore - data.amount);
      }

      const transactionCode = generateEntityCode("W");
      const operatorId = data.actorId || data.customerId;

      TopupTransactionRepository.balanceCache.delete(data.customerId);

      return await this.prisma.topupTransaction.create({
        data: {
          customerId: data.customerId,
          transactionCode,
          topupType: TopupType.PAID, // Ánh xạ enum TopupType.PAID
          currency: "USD",
          submissionDate: new Date(),
          wireDate: new Date(),
          paymentMethodId: null, // LƯU Ý NGHIỆP VỤ: Thanh toán đơn hàng trực tiếp qua Ví nên paymentMethodId để null trong DB
          wireAmount: new Prisma.Decimal(data.amount),
          wireAmountApprove: new Prisma.Decimal(data.amount),
          description: data.description || data.orderId,
          orderId: data.orderId,
          orderCode: data.orderCode,
          accountBalanceBefore: new Prisma.Decimal(balanceBefore),
          amountChange: new Prisma.Decimal(data.amount),
          accountBalanceAfter: new Prisma.Decimal(balanceAfter),
          status: TopupStatus.CONFIRMED, // 2 = Confirmed / Paid
          createdBy: operatorId,
          updatedBy: operatorId,
          histories: {
            create: {
              actionName: `Thanh toán đơn hàng #${data.orderCode}`,
              wireAmountApproved: new Prisma.Decimal(data.amount),
              status: TopupStatus.CONFIRMED,
              createdBy: operatorId,
            },
          },
        },
        include: {
          wireImages: true,
          paymentMethod: true,
          customer: true,
        },
      });
    } finally {
      // BƯỚC 7: Giải phóng Mutex Lock trong mọi trường hợp
      TopupTransactionRepository.payingOrderIds.delete(data.orderId);
    }
  }

  private static balanceCache = new Map<string, { balance: number; expiresAt: number }>();

  /**
   * Lấy số dư ví khả dụng của khách hàng từ API Ví Độc Lập hoặc DB local fallback (với TTL Cache 3 giây)
   */
  async getWalletBalance(customerId: string): Promise<number> {
    const cached = TopupTransactionRepository.balanceCache.get(customerId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.balance;
    }

    let fetchedBalance: number | null = null;
    try {
      const walletClient = new ExternalWalletClient();
      const accountInfoRes = await walletClient.getAccountInfo({ partnerId: customerId });
      const resData = (accountInfoRes as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const rawBal =
        resData?.balance ??
        resData?.accountBalance ??
        resData?.account_balance ??
        (resData?.accountInfo as Record<string, unknown> | undefined)?.balance;

      if (rawBal !== undefined && rawBal !== null && !Number.isNaN(Number(rawBal))) {
        fetchedBalance = Number(rawBal);
      }
    } catch {
      // Fallback DB Local
    }

    if (fetchedBalance === null) {
      const latestTx = await this.prisma.topupTransaction.findFirst({
        where: { customerId, status: TopupStatus.CONFIRMED },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: { accountBalanceAfter: true },
      });
      fetchedBalance = latestTx?.accountBalanceAfter ? Number(latestTx.accountBalanceAfter) : 0.0;
    }

    TopupTransactionRepository.balanceCache.set(customerId, {
      balance: fetchedBalance,
      expiresAt: Date.now() + 3000,
    });

    return fetchedBalance;
  }

  /**
   * Hoàn tiền ví khách hàng khi hủy đơn hàng / hủy nhãn tem (`refundOrderWithWallet`)
   */
  async refundOrderWithWallet(data: {
    orderId: string;
    orderCode: string;
    amount: number;
    customerId: string;
    actorId?: string;
    description?: string;
  }) {
    if (data.amount <= 0) return null;

    // Lớp 1 Idempotency Guard: Tránh hoàn tiền 2 lần (Double Refund) cho cùng 1 đơn hàng
    const existingRefund = await this.prisma.topupTransaction.findFirst({
      where: {
        orderId: data.orderId,
        topupType: TopupType.REFUNDED,
        status: TopupStatus.CONFIRMED,
      },
    });

    if (existingRefund) {
      return existingRefund;
    }

    TopupTransactionRepository.balanceCache.delete(data.customerId);

    const balanceBefore = await this.getWalletBalance(data.customerId);
    const customerCode = await this.getCustomerCode(data.customerId);

    // Đảm bảo tài khoản ví đã được tạo trên Hệ Thống Ví Độc Lập qua getWalletSummary master
    await this.getWalletSummary(data.customerId);

    const walletClient = new ExternalWalletClient();
    const chargingRes = await walletClient.chargingRequest(
      {
        fromSystem: EXTERNAL_WALLET_FROM_SYSTEM,
        buyerInfo: {
          partnerId: data.customerId,
          partnerCode: customerCode,
        },
        orderItem: {
          actionType: ExternalWalletActionType.INCREASE, // 1 = Cộng tiền ví
          paymentType: EXTERNAL_WALLET_PAYMENT_TYPE,
          price: data.amount,
          note: `Refund for order #${data.orderCode}`,
          orderCode: data.orderCode,
        },
      },
      () => this.getCustomerCode(data.customerId),
    );

    const roundCurrency = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
    const chargingData = (chargingRes as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    const resBalAfter = chargingData?.balance ?? chargingData?.accountBalance;

    let balanceAfter: number;
    if (resBalAfter !== undefined && resBalAfter !== null && !Number.isNaN(Number(resBalAfter))) {
      balanceAfter = roundCurrency(Number(resBalAfter));
    } else {
      balanceAfter = roundCurrency(balanceBefore + data.amount);
    }

    const transactionCode = generateEntityCode("W");
    const operatorId = data.actorId || data.customerId;

    return await this.prisma.topupTransaction.create({
      data: {
        customerId: data.customerId,
        transactionCode,
        topupType: TopupType.REFUNDED,
        currency: "USD",
        submissionDate: new Date(),
        wireDate: new Date(),
        paymentMethodId: null,
        wireAmount: new Prisma.Decimal(data.amount),
        wireAmountApprove: new Prisma.Decimal(data.amount),
        description: data.description || `Hoàn tiền hủy tem đơn #${data.orderCode}`,
        orderId: data.orderId,
        orderCode: data.orderCode,
        accountBalanceBefore: new Prisma.Decimal(balanceBefore),
        amountChange: new Prisma.Decimal(data.amount),
        accountBalanceAfter: new Prisma.Decimal(balanceAfter),
        status: TopupStatus.CONFIRMED,
        createdBy: operatorId,
        updatedBy: operatorId,
        histories: {
          create: {
            actionName: `Hoàn tiền hủy tem đơn #${data.orderCode}`,
            wireAmountApproved: new Prisma.Decimal(data.amount),
            status: TopupStatus.CONFIRMED,
            createdBy: operatorId,
          },
        },
      },
      include: {
        wireImages: true,
        paymentMethod: true,
        customer: true,
      },
    });
  }
}
