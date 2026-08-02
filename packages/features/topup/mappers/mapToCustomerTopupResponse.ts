export const IS_BANK = {
  TRUE: true,
  FALSE: false,
} as const;

export type IS_BANK = (typeof IS_BANK)[keyof typeof IS_BANK];

/**
 * Chuyển đổi đường dẫn tương đối (relative path) của file asset sang URL tuyệt đối (absolute URL).
 * 
 * @param relativePath Đường dẫn tương đối (ví dụ: "/uploads/icon.png")
 * @returns Đường dẫn URL hoàn chỉnh bao gồm domain Backend API
 */
export function buildAssetUrl(relativePath?: string | null): string | null {
  if (!relativePath) return null;
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  const apiDomain =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.PUBLIC_API_URL ||
    process.env.APP_URL ||
    process.env.API_URL ||
    "https://dev-api.ecomexpress.vn";

  const cleanDomain = apiDomain.replace(/\/$/, "");
  const cleanPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${cleanDomain}${cleanPath}`;
}

/**
 * Chuẩn hóa đối tượng Phương thức thanh toán (TopupPaymentMethod) trả về cho Client/API.
 * Tự động build absolute URL cho icon & image, bảo đảm kiểu dữ liệu Boolean cho isBank & isDefault.
 */
export function mapTopupPaymentMethodToResponse(pm: any) {
  if (!pm) return null;
  return {
    id: pm.id,
    name: pm.name,
    status: pm.status,
    isBank: Boolean(pm.isBank),
    isDefault: Boolean(pm.isDefault),
    icon: buildAssetUrl(pm.icon),
    image: buildAssetUrl(pm.image),
    position: pm.position,
    dataInfo: pm.dataInfo,
    createdAt: pm.createdAt ? new Date(pm.createdAt).toISOString() : "",
    updatedAt: pm.updatedAt ? new Date(pm.updatedAt).toISOString() : "",
  };
}

/**
 * Chuẩn hóa bản ghi Giao dịch nạp tiền (TopupTransaction) trả về cho Client/API.
 * Chuyển đổi Decimal sang Number, ISO Date String và danh sách ảnh chứng từ tuyệt đối.
 */
export function mapTopupTransactionToResponse(item: any) {
  return {
    id: String(item.id),
    transactionCode: item.transactionCode,
    orderCode: item.orderCode ?? item.transactionCode,
    submissionDate: item.submissionDate ? new Date(item.submissionDate).toISOString() : "",
    wireDate: item.wireDate ? new Date(item.wireDate).toISOString() : "",
    paymentMethodId: item.paymentMethodId,
    paymentMethod: item.paymentMethod?.name ?? "Other",
    paymentMethodName: item.paymentMethod?.name ?? "Other",
    paymentMethodIcon: buildAssetUrl(item.paymentMethod?.icon),
    paymentMethodIsBank: Boolean(item.paymentMethod?.isBank),
    wireTransferConfirmation: item.transactionCode,
    status: item.status,
    wireAmount: item.wireAmount ? Number(item.wireAmount) : 0,
    wireAmountApproved: item.wireAmountApprove ? Number(item.wireAmountApprove) : 0,
    rate: item.rate ? Number(item.rate) : null,
    description: item.description ?? "",
    accountBalanceBefore: Number(item.accountBalanceBefore ?? 0),
    amountChange: Number(item.amountChange ?? 0),
    accountBalanceAfter: Number(item.accountBalanceAfter ?? 0),
    customerId: item.customerId,
    customerCode: item.customer?.customerCode || item.customer?.username || item.customerId,
    customerName: item.customer?.name || item.customer?.email || item.customerId,
    customerEmail: item.customer?.email || "",
    wireImages: item.wireImages
      ? item.wireImages.map((img: any) => buildAssetUrl(img.imageUrl))
      : [],
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : "",
  };
}
