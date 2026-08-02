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

const RECORD_DESCRIPTION_MAP: Record<string, { vi: string; en: string }> = {
  ADDED_FUNDS: {
    vi: "Nạp tiền vào ví thành công",
    en: "Balance topped up successfully",
  },
  PAID: {
    vi: "Số tiền đã khấu trừ để thanh toán",
    en: "Amount deducted for make payment",
  },
  CANCELED: {
    vi: "Giao dịch nạp tiền đã hủy",
    en: "Top-up transaction canceled",
  },
  REFUNDED: {
    vi: "Hoàn tiền vào ví",
    en: "Refunded to wallet",
  },
  ADJUST_BALANCE_INCREASE: {
    vi: "Điều chỉnh tăng số dư ví",
    en: "Balance adjustment increase",
  },
  ADJUST_BALANCE_DECREASE: {
    vi: "Điều chỉnh giảm số dư ví",
    en: "Balance adjustment decrease",
  },
};

/**
 * Lấy mô tả đa ngôn ngữ tự động cho biến động giao dịch ví theo `topupType` & `locale`
 */
export function getTransactionDescription(topupType?: string | null, locale?: string | null): string {
  if (!topupType) return "";
  const langKey = (locale || "").toLowerCase().startsWith("vi") ? "vi" : "en";
  const mapped = RECORD_DESCRIPTION_MAP[topupType];
  if (mapped) {
    return mapped[langKey];
  }
  return topupType;
}

/**
 * Hàm mapper chuẩn hóa dữ liệu từ Prisma Model TopupTransaction sang DTO trả về cho Client.
 * - Chuyển đổi kiểu dữ liệu Decimal trong DB thành kiểu Number JavaScript để tránh lỗi serialize JSON.
 * - Ánh xạ `topupType` qua Enum `TopupType`, fallback mặc định `TopupType.ADDED_FUNDS`.
 * - Tự động điền `description` đa ngôn ngữ (VI/EN) theo `topupType` và `locale` nếu bản ghi chưa có mô tả.
 * 
 * @param item Bản ghi giao dịch từ truy vấn Prisma TopupTransaction
 * @param locale Mã ngôn ngữ từ request (x-locale / ctx.locale)
 * @returns Đối tượng DTO TransactionHistoryItemResponse hoàn chỉnh
 */
export function mapToTransactionHistoryResponse(
  item: any,
  locale?: string | null,
): TransactionHistoryItemResponse {
  const submissionDateIso = item.submissionDate
    ? new Date(item.submissionDate).toISOString()
    : item.createdAt
    ? new Date(item.createdAt).toISOString()
    : null;

  const topupTypeVal = item.topupType ?? TopupType.ADDED_FUNDS;
  const defaultDesc = getTransactionDescription(topupTypeVal, locale);

  const finalDescription =
    item.description && item.description.trim() !== ""
      ? item.description
      : defaultDesc;

  return {
    id: String(item.id),
    submissionDate: submissionDateIso,
    orderCode: item.orderCode ?? null,
    orderId: item.orderId ?? null,
    topupType: topupTypeVal,
    accountBalanceBefore: item.accountBalanceBefore ? Number(item.accountBalanceBefore) : 0,
    amountChange: item.amountChange ? Number(item.amountChange) : 0,
    accountBalanceAfter: item.accountBalanceAfter ? Number(item.accountBalanceAfter) : 0,
    description: finalDescription,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
  };
}
