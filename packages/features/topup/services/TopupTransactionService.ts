import type {
  FilterTopupHistoryParams,
  TopupExchangeRateRepository,
  TopupPaymentMethodRepository,
  TopupTransactionRepository,
} from "../repositories";
import { mapTopupPaymentMethodToResponse, mapTopupTransactionToResponse } from "../mappers";
import { ExternalWalletClient } from "../clients";
import { generateEntityCode } from "@flash-ship/ecom-lib";

/**
 * Service quản lý logic nghiệp vụ Nạp tiền (Topup Transaction) & Ví
 */
export class TopupTransactionService {
  constructor(
    private transactionRepo: TopupTransactionRepository,
    private paymentMethodRepo: TopupPaymentMethodRepository,
    private exchangeRateRepo: TopupExchangeRateRepository,
  ) {}

  /**
   * Lấy thông tin tổng quan Ví của khách hàng (Số dư thực tế & Tiền chờ xác nhận)
   * - Lấy số dư khả dụng thực tế bằng cách gọi sang API Hệ Thống Ví Độc Lập (/payment-api/account/info)
   * - Fallback về số dư tính toán nội bộ nếu Hệ Thống Ví Độc Lập gián đoạn
   */
  async getWalletSummary(customerId: string) {
    const summary = await this.transactionRepo.getWalletSummary(customerId);
    try {
      const walletClient = new ExternalWalletClient();
      const extWallet = await walletClient.getAccountInfo({ partnerId: customerId });
      if (extWallet?.data?.accountBalance !== undefined && extWallet?.data?.accountBalance !== null) {
        summary.accountBalance = Number(extWallet.data.accountBalance);
      }
    } catch (err) {
      // Dự phòng về số dư nội bộ nếu hệ thống ví độc lập không phản hồi
    }
    return summary;
  }

  /**
   * Lấy danh sách các phương thức thanh toán nạp tiền công khai cho khách hàng
   */
  async getPaymentMethods(customerId: string) {
    const list = await this.paymentMethodRepo.getPaymentMethodsForCustomer(customerId);
    return list.map(mapTopupPaymentMethodToResponse);
  }

  /**
   * Lấy tỷ giá quy đổi ngoại tệ USD / VND mới nhất theo ngày
   * Mặc định 25.000 VND / 1 USD nếu chưa có dữ liệu cấu hình
   */
  async getLatestExchangeRate(date?: Date) {
    const rateItem = await this.exchangeRateRepo.getExchangeRateByDate(date);
    return rateItem ? Number(rateItem.rate) : 25000;
  }

  /**
   * Lấy danh sách lịch sử nạp tiền phân trang theo khách hàng & bộ lọc
   */
  async getTopupHistory(params: FilterTopupHistoryParams) {
    const result = await this.transactionRepo.getTopupHistory(params);
    return {
      data: result.data.map(mapTopupTransactionToResponse),
      meta: result.meta,
    };
  }

  /**
   * Khởi tạo yêu cầu nạp tiền mới từ ứng dụng Customer
   * - Tự động sinh mã giao dịch duy nhất (transactionCode)
   * - Tạo bản ghi nạp tiền ở trạng thái Chờ xác nhận (status = 1 WAITING)
   * - Lưu vết danh sách ảnh chứng từ xác nhận chuyển khoản (wireImages)
   * - Ghi log lịch sử tại topup_transaction_histories (actionName = "Khách hàng tạo mới giao dịch")
   * - LƯU Ý: KHÔNG gọi API chargingRequest tới ví độc lập ở bước này (tiền chỉ cộng khi Admin phê duyệt)
   */
  async createTopupRequest(data: {
    customerId: string;
    paymentMethodId: number;
    wireAmount: number;
    description?: string;
    wireDate?: Date;
    wireImages?: string[];
  }) {
    // 1. Validate Wire Amount
    if (!data.wireAmount || data.wireAmount <= 0) {
      throw new Error("Số tiền nạp phải lớn hơn 0.");
    }

    // 2. Validate Wire Date
    if (data.wireDate && data.wireDate > new Date()) {
      throw new Error("Ngày chuyển tiền không được lớn hơn ngày hiện tại.");
    }

    // 3. Validate Wire Images
    if (!data.wireImages || data.wireImages.length === 0) {
      throw new Error("Vui lòng tải lên ít nhất 1 ảnh chứng từ xác nhận chuyển tiền.");
    }
    if (data.wireImages.length > 10) {
      throw new Error("Tối đa chỉ được tải lên 10 ảnh chứng từ.");
    }

    // Sinh mã giao dịch duy nhất dạng W260730...
    const transactionCode = generateEntityCode("W");
    const currentRate = await this.getLatestExchangeRate();

    const transaction = await this.transactionRepo.createTopupRequest({
      customerId: data.customerId,
      transactionCode,
      paymentMethodId: data.paymentMethodId,
      wireAmount: data.wireAmount,
      rate: currentRate,
      description: data.description,
      wireDate: data.wireDate,
      wireImages: data.wireImages,
    });

    return mapTopupTransactionToResponse(transaction);
  }

  /**
   * Cập nhật thông tin yêu cầu nạp tiền khi ở trạng thái Chờ xác nhận (status = 1)
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
    if (data.wireAmount !== undefined && data.wireAmount <= 0) {
      throw new Error("Số tiền nạp phải lớn hơn 0.");
    }

    if (data.wireDate && data.wireDate > new Date()) {
      throw new Error("Ngày chuyển tiền không được lớn hơn ngày hiện tại.");
    }

    if (data.wireImages !== undefined) {
      if (data.wireImages.length === 0) {
        throw new Error("Vui lòng tải lên ít nhất 1 ảnh chứng từ xác nhận chuyển tiền mới.");
      }
      if (data.wireImages.length > 10) {
        throw new Error("Tối đa chỉ được tải lên 10 ảnh chứng từ.");
      }
    }

    const updated = await this.transactionRepo.updateTopupRequest(id, customerId, data);
    return mapTopupTransactionToResponse(updated);
  }

  /**
   * Hủy / từ chối yêu cầu nạp tiền (chuyển status = 3 CANCELLED)
   */
  async cancelTopupRequest(id: number, customerId?: string, actorId?: string, reason?: string) {
    const cancelled = await this.transactionRepo.cancelTopupRequest(id, customerId, actorId, reason);
    return mapTopupTransactionToResponse(cancelled);
  }

  /**
   * Điều chỉnh thông tin giao dịch nạp tiền (Dành cho Admin)
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
    const adjusted = await this.transactionRepo.adjustTopupRequest(id, actorId, data);
    return mapTopupTransactionToResponse(adjusted);
  }

  /**
   * Phê duyệt giao dịch nạp tiền (Dành cho Admin)
   */
  async approveTopupRequest(id: number, actorId: string) {
    const approved = await this.transactionRepo.approveTopupRequest(id, actorId);
    return mapTopupTransactionToResponse(approved);
  }
}
