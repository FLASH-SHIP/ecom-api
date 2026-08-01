import { TopupType } from "@flash-ship/ecom-types";

/**
 * Interface kiểu dữ liệu trả về cho API Lịch Sử Giao Dịch Ví (`TransactionHistoryItemResponse`)
 */
export interface TransactionHistoryItemResponse {
  /** ID bản ghi giao dịch (chuỗi duy nhất) */
  id: string;
  /** Ngày xác nhận nạp tiền / Ngày tạo giao dịch dạng ISO string */
  submissionDate: string | null;
  /** Mã đơn hàng (order_code) */
  orderCode: string | null;
  /** ID đơn hàng (order_id) */
  orderId: string | null;
  /** Loại giao dịch ví (topupType dạng enum TopupType) */
  topupType: TopupType | string;
  /** Số dư tài khoản trước giao dịch (account_balance_before) */
  accountBalanceBefore: number;
  /** Biến động số tiền giao dịch (amount_change) */
  amountChange: number;
  /** Số dư tài khoản sau giao dịch (account_balance_after) */
  accountBalanceAfter: number;
  /** Mô tả nội dung giao dịch (description) */
  description: string | null;
  /** Thời gian tạo bản ghi dạng ISO string */
  createdAt: string | null;
  /** Thời gian cập nhật bản ghi dạng ISO string */
  updatedAt: string | null;
}

/**
 * Hàm mapper chuẩn hóa dữ liệu từ Prisma Model TopupTransaction sang DTO trả về cho Client.
 * - Chuyển đổi kiểu dữ liệu Decimal trong DB thành kiểu Number JavaScript để tránh lỗi serialize JSON.
 * - Ánh xạ `topupType` qua Enum `TopupType`, fallback mặc định `TopupType.ADDED_FUNDS`.
 * 
 * @param item Bản ghi giao dịch từ truy vấn Prisma TopupTransaction
 * @returns Đối tượng DTO TransactionHistoryItemResponse hoàn chỉnh
 */
export function mapToTransactionHistoryResponse(item: any): TransactionHistoryItemResponse {
  const submissionDateIso = item.submissionDate
    ? new Date(item.submissionDate).toISOString()
    : item.createdAt
    ? new Date(item.createdAt).toISOString()
    : null;

  return {
    id: String(item.id),
    submissionDate: submissionDateIso,
    orderCode: item.orderCode ?? null,
    orderId: item.orderId ?? null,
    topupType: item.topupType ?? TopupType.ADDED_FUNDS,
    accountBalanceBefore: item.accountBalanceBefore ? Number(item.accountBalanceBefore) : 0,
    amountChange: item.amountChange ? Number(item.amountChange) : 0,
    accountBalanceAfter: item.accountBalanceAfter ? Number(item.accountBalanceAfter) : 0,
    description: item.description ?? null,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
  };
}
