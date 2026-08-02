import type {
  FilterTopupHistoryParams,
  FilterTransactionHistoryParams,
  TopupExchangeRateRepository,
  TopupPaymentMethodRepository,
  TopupTransactionRepository,
} from "../repositories";
import {
  mapTopupPaymentMethodToResponse,
  mapTopupTransactionToResponse,
  mapToTransactionHistoryResponse,
} from "../mappers";
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
   * - Ưu tiên lấy số dư ví thực tế bằng cách gọi sang API Hệ Thống Ví Độc Lập (/payment-api/account/info)
   * - Dự phòng (Fallback) về số dư giao dịch đã xác nhận gần nhất trong DB Local nếu hệ thống ví gặp sự cố
   * - Tính tổng wireAmount các giao dịch đang ở trạng thái Chờ xác nhận (status = TopupStatus.WAITING)
   *
   * @param customerId ID khách hàng
   */
  async getWalletSummary(customerId: string) {
    return this.transactionRepo.getWalletSummary(customerId);
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
   * Lấy danh sách lịch sử biến động số dư ví (dành cho bảng TransactionTable.tsx)
   * - Tự động ánh xạ dữ liệu qua mapper `mapToTransactionHistoryResponse`.
   * - Trả về `data` danh sách mảng đối tượng DTO và `meta` thông tin phân trang.
   * 
   * @param params Bộ lọc truy vấn dữ liệu giao dịch ví
   */
  async getTransactionHistoryList(params: FilterTransactionHistoryParams) {
    const result = await this.transactionRepo.getTransactionHistoryList(params);
    return {
      data: result.data.map(mapToTransactionHistoryResponse),
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
    currency?: string;
    rate?: number;
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
    const rateToUse = data.rate !== undefined ? data.rate : await this.getLatestExchangeRate();

    const transaction = await this.transactionRepo.createTopupRequest({
      customerId: data.customerId,
      transactionCode,
      paymentMethodId: data.paymentMethodId,
      wireAmount: data.wireAmount,
      currency: data.currency,
      rate: rateToUse,
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

  /**
   * Trừ số dư ví khách hàng khi thanh toán đơn hàng thành công (`payOrderWithWallet`)
   * - Kiểm tra tính hợp lệ của tham số đầu vào (`amount > 0`, `orderId`, `orderCode`).
   * - Ủy thác xử lý quy trình 5 bước cho Repository `payOrderWithWallet`.
   * - Ánh xạ đối tượng giao dịch trả về cho Client thông qua `mapTopupTransactionToResponse`.
   *
   * @param data Tham số thanh toán đơn hàng (orderId, orderCode, amount, customerId, actorId, description)
   */
  async payOrderWithWallet(data: {
    orderId: string;
    orderCode: string;
    amount: number;
    customerId: string;
    actorId?: string;
    description?: string;
  }) {
    if (!data.customerId) {
      throw new Error("Mã khách hàng customerId không được để trống.");
    }
    if (!data.amount || data.amount <= 0) {
      throw new Error("Số tiền thanh toán đơn hàng phải lớn hơn 0.");
    }
    if (!data.orderId || !data.orderCode) {
      throw new Error("Vui lòng cung cấp đầy đủ mã định danh đơn hàng (orderId, orderCode).");
    }

    const transaction = await this.transactionRepo.payOrderWithWallet(data);
    return mapTopupTransactionToResponse(transaction);
  }
}
