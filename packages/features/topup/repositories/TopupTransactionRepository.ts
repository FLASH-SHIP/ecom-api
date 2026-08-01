import { Prisma, TopupType, type PrismaClient } from "@ecom/prisma";
import { TopupStatus } from "@flash-ship/ecom-types";
import { ExternalWalletClient } from "../clients";

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
  async getCustomerCode(customerId: string): Promise<string> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { customerCode: true, username: true },
    });
    return customer?.customerCode || customer?.username || customerId;
  }

  /**
   * Lấy tổng quan số dư ví tài khoản của khách hàng
   * 1. accountBalance: Số dư ví khả dụng hiện tại (Lấy từ giao dịch Đã duyệt gần nhất status = TopupStatus.CONFIRMED, hoặc 0.00)
   * 2. waitingConfirmTopup: Tổng số tiền nạp đang chờ duyệt (Tổng wireAmount của các giao dịch status = TopupStatus.WAITING)
   *
   * @param customerId ID khách hàng cần truy vấn
   * @returns Đối tượng chứa số dư ví khả dụng và tổng tiền chờ duyệt
   */
  async getWalletSummary(customerId: string) {
    // 1. Lấy giao dịch đã xác nhận (status = TopupStatus.CONFIRMED) gần nhất để tính số dư khả dụng
    const latestTx = await this.prisma.topupTransaction.findFirst({
      where: {
        customerId,
        status: TopupStatus.CONFIRMED, // 2 = Confirmed / Approved
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

  /**
   * Lấy danh sách lịch sử nạp tiền có phân trang và bộ lọc
   * - Mặc định nếu không truyền dateFrom & dateTo: Lấy tự động khoảng 7 ngày gần nhất
   * - Phân trang mặc định: page = 1, pageSize = 10
   *
   * @param params Đối tượng chứa bộ lọc và tham số phân trang
   * @returns Danh sách bản ghi và thông tin phân trang (total, page, totalPages)
   */
  async getTopupHistory(params: FilterTopupHistoryParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 10;
    const skip = (page - 1) * pageSize;

    // Thiết lập khoảng thời gian 7 ngày mặc định nếu người dùng không chọn ngày
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

    const where: Prisma.TopupTransactionWhereInput = {};

    // Lọc theo khách hàng nếu được cung cấp (Cách ly dữ liệu người dùng)
    if (params.customerId) {
      where.customerId = params.customerId;
    }

    // Lọc theo khoảng thời gian tạo giao dịch (createdAt)
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = fromDate;
      }
      if (toDate) {
        const endOfToDate = new Date(toDate);
        endOfToDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfToDate;
      }
    }

    // Lọc theo trạng thái giao dịch (status enum: 1 = Waiting, 2 = Confirmed, 3 = Reject)
    if (params.status && params.status !== "ALL") {
      const statusNum = Number.parseInt(params.status, 10);
      if (!Number.isNaN(statusNum)) {
        where.status = statusNum;
      }
    }

    // Lọc theo phương thức thanh toán
    if (params.paymentMethodId) {
      where.paymentMethodId = params.paymentMethodId;
    }

    // Tìm kiếm theo từ khóa (Mã giao dịch, Mã đơn hàng, Nội dung ghi chú)
    if (params.search && params.search.trim() !== "") {
      const searchStr = params.search.trim();
      where.OR = [
        { transactionCode: { contains: searchStr, mode: "insensitive" } },
        { orderCode: { contains: searchStr, mode: "insensitive" } },
        { description: { contains: searchStr, mode: "insensitive" } },
      ];
    }

    // Xử lý động tiêu chí sắp xếp (Sorting)
    let orderBy: Prisma.TopupTransactionOrderByWithRelationInput = { createdAt: "desc" };

    if (params.sortBy) {
      const order = params.sortOrder === "asc" ? "asc" : "desc";
      switch (params.sortBy) {
        case "transactionCode":
          orderBy = { transactionCode: order };
          break;
        case "submissionDate":
        case "createdAt":
          orderBy = { createdAt: order };
          break;
        case "wireDate":
          orderBy = { wireDate: order };
          break;
        case "wireAmount":
          orderBy = { wireAmount: order };
          break;
        case "wireAmountApprove":
          orderBy = { wireAmountApprove: order };
          break;
        case "customerCode":
          orderBy = { customer: { customerCode: order } };
          break;
        case "customerName":
          orderBy = { customer: { name: order } };
          break;
        case "status":
          orderBy = { status: order };
          break;
        default:
          orderBy = { createdAt: "desc" };
      }
    }

    // Thực hiện truy vấn danh sách và tổng số lượng bản ghi song song
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
      // Nếu có cập nhật ảnh mới, xóa danh sách ảnh cũ trước
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
          actionName: "UPDATED",
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
          actionName: "CANCELLED",
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
          status: updated.status,
          createdBy: actorId,
        },
      });

      return updated;
    });
  }

  /** Map khóa giao dịch đang trong quá trình phê duyệt (Chống race condition 2 Admin phê duyệt cùng lúc) */
  private static approvingTransactionIds = new Set<number>();

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

    // BƯỚC 1: BẮT BỤỘC gọi API cộng tiền (chargingRequest actionType = 1: INCREASE) sang Hệ Thống Ví Độc Lập TRƯỚC.
    // LƯU Ý KỸ THUẬT: Nếu bước này bị lỗi HTTP (500, Timeout, mảng mạng gián đoạn), đợt gọi sẽ quăng Exception (throw Error).
    // DB Local giữ nguyên status = 1 (WAITING) mà không bị ghi dữ liệu nhầm hay cần rollback thủ công phức tạp.
    const walletClient = new ExternalWalletClient();
    await walletClient.chargingRequest({
      fromSystem: "ECOM",
      buyerInfo: {
        partnerId: existing.customerId,
        partnerCode: existing.customer?.customerCode || "",
      },
      orderItem: {
        actionType: 1, // ExternalWalletActionType.INCREASE = 1 (Cộng tiền vào ví)
        paymentType: "E_WALLET",
        price: approvedAmount,
        note: `Approved topup transaction #${existing.transactionCode}`,
        orderCode: null,
      },
    });

    // BƯỚC 2: Gọi getAccountInfo lấy số dư THỰC TẾ mới nhất từ Ví Độc Lập làm Single Source of Truth.
    // LƯU Ý KỸ THUẬT: Bóc tách dữ liệu an toàn 3 cấu trúc key trả về có thể có từ Java/Node API (`balance`, `accountBalance`, `account_balance`).
    let balanceAfter: number | null = null;
    try {
      const accountInfo = await walletClient.getAccountInfo({ partnerId: existing.customerId });
      const resData = accountInfo?.data as any;
      const rawBal = resData?.balance ?? resData?.accountBalance ?? resData?.account_balance;
      if (rawBal !== undefined && rawBal !== null && !isNaN(Number(rawBal))) {
        balanceAfter = Number(rawBal);
      }
    } catch {
      // Dự phòng an toàn: Nếu API getAccountInfo gặp sự cố tạm thời ngay sau khi charging thành công, tự cộng dựa trên số dư trước đó.
    }

    // Tính toán số dư trước và sau giao dịch
    if (balanceAfter === null) {
      balanceAfter = Number(existing.accountBalanceBefore || 0) + approvedAmount;
    }
    const balanceBefore = Math.max(0, balanceAfter - approvedAmount);

    // BƯỚC 3: Cập nhật DB Local trong $transaction nhanh gọn (< 5ms)
    // Cập nhật trọn vẹn 3 trường: account_balance_before, amount_change (approvedAmount), và account_balance_after
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
          },
        });

        // Ghi nhật ký lịch sử thao tác Phê duyệt
        await tx.topupTransactionHistory.create({
          data: {
            actionName: "Xác nhận giao dịch thanh toán",
            topupTransactionId: id,
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
}
