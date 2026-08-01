/**
 * DTO Yêu cầu tạo tài khoản ví cho partner mới.
 * partnerId: UUID string hoặc mã ID của khách hàng.
 * partnerCode: Mã customer_code của khách hàng.
 */
export interface CreateWalletAccountRequest {
  partnerId: string | number;
  partnerCode: string;
}

/**
 * DTO Yêu cầu lấy thông tin tài khoản ví partner.
 */
export interface WalletAccountInfoRequest {
  partnerId: string | number;
}

/**
 * DTO Yêu cầu cập nhật hạn mức tín dụng (credit limit) cho partner.
 */
export interface UpdateCreditLimitRequest {
  partnerId: string | number;
  creditLimit: number;
}

/**
 * Cấu trúc thông tin người mua (buyer) trong giao dịch ví.
 */
export interface BuyerInfo {
  partnerId: string | number;
  partnerCode: string;
}

export enum ExternalWalletActionType {
  INCREASE = 1, // Cộng tiền
  DECREASE = 2, // Trừ tiền
}

/**
 * Cấu trúc thông tin item đơn hàng trong giao dịch nạp / trừ tiền.
 */
export interface OrderItemInfo {
  actionType: ExternalWalletActionType | number;
  paymentType: string;
  price: number;
  note?: string | null;
  orderCode?: string | null;
}

/**
 * DTO Thực hiện giao dịch nạp/trừ tiền trên ví.
 * fromSystem mặc định là "ECOM".
 */
export interface ChargingRequest {
  fromSystem: "ECOM" | string;
  buyerInfo: BuyerInfo;
  orderItem: OrderItemInfo;
}

/**
 * Cấu trúc Response chuẩn trả về từ Hệ Thống Ví Độc Lập.
 */
export interface ExternalWalletBaseResponse<T = any> {
  code?: number | string;
  message?: string;
  success?: boolean;
  data?: T;
}

/**
 * Cấu trúc dữ liệu tài khoản ví nhận được từ hệ thống ví độc lập.
 */
export interface WalletAccountData {
  partnerId: string | number;
  partnerCode?: string;
  balance?: number;
  creditLimit?: number;
  status?: string;
  [key: string]: any;
}
